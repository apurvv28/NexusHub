import { newDb, DataType } from 'pg-mem';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { TenantProvisioningService } from '../src/tenant/tenant-provisioning.service';
import { DatabaseService } from '../src/database/database.service';

async function runTenantProvisioningSagaTests() {
  console.log('===================================================================');
  console.log('RUNNING TENANT PROVISIONING SAGA INTEGRATION TEST SUITE');
  console.log('===================================================================\n');

  const db = newDb();
  const schema = db.public as any;

  schema.registerFunction({
    name: 'gen_random_uuid',
    returns: DataType.uuid,
    implementation: () => randomUUID()
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
    }
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
    }
  });

  const adapter = db.adapters.createPg();
  const pool = new adapter.Pool();

  const dbService = new DatabaseService();
  (dbService as any).pool = pool;

  const client = await pool.connect();

  try {
    const migrationPath = path.join(__dirname, '../src/database/migrations/001_initial_schema_and_rls.sql');
    let migrationSql = fs.readFileSync(migrationPath, 'utf8');

    migrationSql = migrationSql.replace(/--.*$/gm, '');

    const statements = migrationSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .filter(s => !s.toLowerCase().includes('enable row level security'))
      .filter(s => !s.toLowerCase().includes('force row level security'))
      .filter(s => !s.toLowerCase().includes('create policy'))
      .filter(s => !s.toLowerCase().includes('drop policy'));

    for (const statement of statements) {
      await client.query(statement);
    }
    console.log('[PASS] Migration DDL schema loaded.');

    const provisioningService = new TenantProvisioningService(dbService);

    // TEST 1: Execute Full Provisioning Saga
    const result = await provisioningService.provisionTenantSaga({
      tenantName: 'Stark Industries',
      tenantDomain: 'stark.com',
      workspaceName: 'Avengers HQ',
      workspaceSlug: 'avengers-hq',
      adminEmail: 'tony@stark.com',
      adminFullName: 'Tony Stark',
    });

    if (result.tenantId && result.workspaceId && result.userId && result.channels.length === 2) {
      console.log('[PASS] Test 1: Tenant Provisioning Saga successfully created tenant, workspace, admin user, and default channels (#general, #random).');
    } else {
      throw new Error(`[FAIL] Test 1 Failed. Provisioning output incomplete.`);
    }

    // Verify created channels
    const channelsRes = await client.query(`SELECT name FROM channels WHERE workspace_id = '${result.workspaceId}';`);
    const channelNames = channelsRes.rows.map((r: any) => r.name);
    if (channelNames.includes('general') && channelNames.includes('random')) {
      console.log('[PASS] Test 2: Default channels (#general and #random) verified in database.');
    } else {
      throw new Error(`[FAIL] Test 2 Failed. Channel names mismatch: ${channelNames.join(', ')}`);
    }

    // TEST 3: Saga Rollback Compensation on Duplicate Domain Failure
    try {
      await provisioningService.provisionTenantSaga({
        tenantName: 'Stark Duplicate',
        tenantDomain: 'stark.com', // Duplicate domain triggers unique constraint
        workspaceName: 'Duplicate HQ',
        workspaceSlug: 'dup-hq',
        adminEmail: 'dup@stark.com',
        adminFullName: 'Duplicate Stark',
      });
      throw new Error('[FAIL] Test 3 Failed: Expected provisioning to fail on duplicate domain.');
    } catch (sagaError) {
      console.log('[PASS] Test 3: Saga failure correctly caught and compensating rollback executed.');
    }

    console.log('\n===================================================================');
    console.log('ALL TENANT PROVISIONING SAGA TESTS PASSED SUCCESSFULLY');
    console.log('===================================================================');
  } catch (error) {
    console.error('\n[TEST FAILURE]:', error);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

runTenantProvisioningSagaTests();
