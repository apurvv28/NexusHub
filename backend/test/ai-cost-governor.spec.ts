import { newDb, DataType } from 'pg-mem';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { HttpException, HttpStatus } from '@nestjs/common';
import { DatabaseService } from '../src/database/database.service';
import { AICostGovernorService } from '../src/ai/ai-cost-governor.service';

async function runAICostGovernorTests() {
  console.log('===================================================================');
  console.log('RUNNING TENANT AI COST GOVERNOR & USAGE DASHBOARD TEST SUITE');
  console.log('===================================================================\n');

  const db = newDb();
  const schema = db.public as any;

  schema.registerFunction({
    name: 'gen_random_uuid',
    returns: DataType.uuid,
    implementation: () => randomUUID(),
  });

  let currentWorkspaceId = '';
  schema.registerFunction({
    name: 'set_config',
    args: [DataType.text, DataType.text, DataType.bool],
    returns: DataType.text,
    implementation: (settingName: string, value: string) => {
      if (settingName === 'app.current_workspace_id') {
        currentWorkspaceId = value;
      }
      return value;
    },
  });

  schema.registerFunction({
    name: 'current_setting',
    args: [DataType.text, DataType.bool],
    returns: DataType.text,
    implementation: (settingName: string) => {
      if (settingName === 'app.current_workspace_id') {
        return currentWorkspaceId;
      }
      return '';
    },
  });

  const adapter = db.adapters.createPg();
  const pool = new adapter.Pool();

  const dbService = new DatabaseService();
  (dbService as any).pool = pool;

  const client = await pool.connect();

  try {
    // 1. Run Migrations 001 through 008
    const migrationFiles = [
      '001_initial_schema_and_rls.sql',
      '002_messaging_schema_and_rls.sql',
      '003_audit_and_presence_schema.sql',
      '004_fulltext_search_index.sql',
      '005_rbac_and_notifications_schema.sql',
      '006_webhooks_and_workflows_schema.sql',
      '007_vector_and_ai_schema.sql',
      '008_ai_governance_and_usage_schema.sql',
    ];

    for (const file of migrationFiles) {
      const filePath = path.join(__dirname, '../src/database/migrations', file);
      let sql = fs.readFileSync(filePath, 'utf8');
      sql = sql.replace(/--.*$/gm, '');
      const stmts = sql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .filter((s) => !s.toLowerCase().includes('create extension'))
        .filter((s) => !s.toLowerCase().includes('enable row level security'))
        .filter((s) => !s.toLowerCase().includes('force row level security'))
        .filter((s) => !s.toLowerCase().includes('create policy'))
        .filter((s) => !s.toLowerCase().includes('drop policy'))
        .filter((s) => !s.toLowerCase().includes('search_vector'));

      for (const st of stmts) {
        await client.query(st);
      }
    }
    console.log('[PASS] Migrations 001 through 008 DDL schema loaded into test DB.');

    // 2. Seed Base Data
    const tenantId = '00000000-0000-0000-0000-000000000001';
    const workspaceId = 'a0000000-0000-0000-0000-00000000000a';
    const userId = '10000000-0000-0000-0000-000000000001';
    const channelId = 'c0000000-0000-0000-0000-00000000000a';

    await client.query(`INSERT INTO tenants (id, name, domain) VALUES ('${tenantId}', 'Acme', 'acme.com');`);
    await client.query(`INSERT INTO workspaces (id, tenant_id, name, slug) VALUES ('${workspaceId}', '${tenantId}', 'WS A', 'ws-a');`);
    await client.query(`INSERT INTO users (id, email, full_name) VALUES ('${userId}', 'alice@acme.com', 'Alice');`);
    await client.query(`INSERT INTO channels (id, workspace_id, name) VALUES ('${channelId}', '${workspaceId}', 'general');`);

    const costGovernor = new AICostGovernorService(dbService);

    // TEST 1: Initial Budget Initialization & Token Consumption
    const initBudget = await costGovernor.getOrCreateBudget(workspaceId);
    if (initBudget.dailyBudgetCents === 5000 && !initBudget.isCircuitBroken) {
      console.log('[PASS] Test 1a: Default workspace budget created ($50.00 / day).');
    } else {
      throw new Error('[FAIL] Test 1a: Default budget creation failed.');
    }

    await costGovernor.checkAndConsumeBudget(workspaceId, userId, 'ask_ai', 500, 10);
    const updatedBudget = await costGovernor.getOrCreateBudget(workspaceId);
    if (updatedBudget.usedTokensToday === 500 && updatedBudget.usedCostCentsToday === 10) {
      console.log('[PASS] Test 1b: Token & cost consumption recorded correctly.');
    } else {
      throw new Error('[FAIL] Test 1b: Token consumption recording failed.');
    }

    // TEST 2: Circuit Breaker & HTTP 429 Hard Budget Cap Throttling
    // Set a tiny budget cap of 15 cents
    await costGovernor.updateBudgetSettings(workspaceId, 15);

    let caught429 = false;
    try {
      // Trying to consume 10 cents more (10 + 10 = 20 > 15 cap)
      await costGovernor.checkAndConsumeBudget(workspaceId, userId, 'summarize', 400, 10);
    } catch (err: any) {
      if (err instanceof HttpException && err.getStatus() === HttpStatus.TOO_MANY_REQUESTS) {
        caught429 = true;
      }
    }

    if (caught429) {
      console.log('[PASS] Test 2a: Hard budget cap exceeded and HTTP 429 (Too Many Requests) returned.');
    } else {
      throw new Error('[FAIL] Test 2a: Budget cap enforcement failed.');
    }

    const brokenBudget = await costGovernor.getOrCreateBudget(workspaceId);
    if (brokenBudget.isCircuitBroken) {
      console.log('[PASS] Test 2b: Workspace AI Circuit Breaker tripped successfully.');
    } else {
      throw new Error('[FAIL] Test 2b: Circuit breaker trip verification failed.');
    }

    // TEST 3: Core Messaging Operations Operational During AI Circuit Break
    // Creating a message must succeed 100% despite AI circuit breaker being tripped!
    const msgRes = await client.query(
      `INSERT INTO messages (workspace_id, channel_id, sender_id, content) VALUES ('${workspaceId}', '${channelId}', '${userId}', 'Operational message while AI circuit broken') RETURNING id;`,
    );

    if (msgRes.rows.length === 1) {
      console.log('[PASS] Test 3: Core messaging operations remain 100% operational during AI circuit break.');
    } else {
      throw new Error('[FAIL] Test 3: Core messaging blocked by AI circuit breaker.');
    }

    // TEST 4: Admin Usage Analytics & Budget Cap Reset
    await costGovernor.updateBudgetSettings(workspaceId, 5000, 10000, true); // Reset circuit breaker & set $50 cap
    const resetBudget = await costGovernor.getOrCreateBudget(workspaceId);

    const analytics = await costGovernor.getUsageAnalytics(workspaceId);
    if (
      !resetBudget.isCircuitBroken &&
      analytics.dailyBudgetCents === 5000 &&
      analytics.recentLogs.length >= 1
    ) {
      console.log('[PASS] Test 4: Workspace Admin usage analytics retrieved and budget cap reset successfully.');
    } else {
      throw new Error('[FAIL] Test 4: Analytics and budget reset failed.');
    }

    console.log('\n===================================================================');
    console.log('ALL AI COST GOVERNOR & USAGE DASHBOARD TESTS PASSED SUCCESSFULLY');
    console.log('===================================================================');
  } catch (error) {
    console.error('\n[TEST FAILURE]:', error);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

runAICostGovernorTests();
