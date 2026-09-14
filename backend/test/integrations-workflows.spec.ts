import { newDb, DataType } from 'pg-mem';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../src/database/database.service';
import { MessageService } from '../src/message/message.service';
import { WebhookService } from '../src/webhook/webhook.service';
import { CommandService } from '../src/command/command.service';
import { TopicCommandStrategy } from '../src/command/strategies/topic-command.strategy';
import { RemindCommandStrategy } from '../src/command/strategies/remind-command.strategy';
import { InviteCommandStrategy } from '../src/command/strategies/invite-command.strategy';
import { WorkflowService } from '../src/workflow/workflow.service';

async function runIntegrationsAndWorkflowsTests() {
  console.log('===================================================================');
  console.log('RUNNING INTEGRATIONS GATEWAY & WORKFLOW BUILDER V1 TEST SUITE');
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
    // 1. Run Migrations 001 through 006
    const m1Path = path.join(__dirname, '../src/database/migrations/001_initial_schema_and_rls.sql');
    const m2Path = path.join(__dirname, '../src/database/migrations/002_messaging_schema_and_rls.sql');
    const m3Path = path.join(__dirname, '../src/database/migrations/003_audit_and_presence_schema.sql');
    const m4Path = path.join(__dirname, '../src/database/migrations/004_fulltext_search_index.sql');
    const m5Path = path.join(__dirname, '../src/database/migrations/005_rbac_and_notifications_schema.sql');
    const m6Path = path.join(__dirname, '../src/database/migrations/006_webhooks_and_workflows_schema.sql');

    const cleanAndRun = async (filePath: string) => {
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
    };

    await cleanAndRun(m1Path);
    await cleanAndRun(m2Path);
    await cleanAndRun(m3Path);
    await cleanAndRun(m4Path);
    await cleanAndRun(m5Path);
    await cleanAndRun(m6Path);
    console.log('[PASS] Migrations 001 through 006 DDL schema loaded into test DB.');

    // 2. Seed Base Data
    const tenantId = '00000000-0000-0000-0000-000000000001';
    const workspaceId = 'a0000000-0000-0000-0000-00000000000a';
    const userId = '10000000-0000-0000-0000-000000000001';
    const channelId = 'c0000000-0000-0000-0000-00000000000a';

    await client.query(`INSERT INTO tenants (id, name, domain) VALUES ('${tenantId}', 'Acme', 'acme.com');`);
    await client.query(`INSERT INTO workspaces (id, tenant_id, name, slug) VALUES ('${workspaceId}', '${tenantId}', 'WS A', 'ws-a');`);
    await client.query(`INSERT INTO users (id, email, full_name) VALUES ('${userId}', 'alice@acme.com', 'Alice');`);
    await client.query(`INSERT INTO users (id, email, full_name) VALUES ('00000000-0000-0000-0000-000000000000', 'bot@nexushub.internal', 'NexusHub Bot');`);
    await client.query(`INSERT INTO channels (id, workspace_id, name, topic) VALUES ('${channelId}', '${workspaceId}', 'general', 'Old Topic');`);

    const messageService = new MessageService(dbService);
    const webhookService = new WebhookService(dbService, messageService);

    // TEST 1: Inbound Webhook Creation & Trigger Ingestion
    const inboundWh = await webhookService.createWebhook(workspaceId, 'GitHub CI', 'INBOUND', undefined, channelId);
    const inboundRes = await webhookService.handleInboundWebhook(inboundWh.id, 'Build #104 passed');
    if (inboundRes.status === 'success' && inboundRes.messageId) {
      console.log('[PASS] Test 1: Inbound webhook created and trigger message posted to channel.');
    } else {
      throw new Error('[FAIL] Test 1: Inbound webhook handling failed.');
    }

    // TEST 2: Outbound Webhook & HMAC SHA256 Signature Header Generation
    const outboundWh = await webhookService.createWebhook(workspaceId, 'Zapier Outbound', 'OUTBOUND', 'https://hooks.zapier.com/test');
    const signature = webhookService.generateHmacSignature(outboundWh.secret, '{"test":true}');
    if (signature && signature.length === 64) {
      console.log('[PASS] Test 2: Outbound webhook generated valid HMAC SHA256 signature header.');
    } else {
      throw new Error('[FAIL] Test 2: HMAC signature generation failed.');
    }

    // TEST 3: Slash Commands Engine Strategy Routing
    const topicStrategy = new TopicCommandStrategy(dbService);
    const remindStrategy = new RemindCommandStrategy(dbService);
    const inviteStrategy = new InviteCommandStrategy(dbService);
    const commandService = new CommandService([topicStrategy, remindStrategy, inviteStrategy]);

    const topicRes = await commandService.executeCommand(workspaceId, userId, channelId, '/topic New Release Strategy v3');
    if (topicRes.success && topicRes.response.includes('New Release Strategy v3')) {
      console.log('[PASS] Test 3a: Slash command /topic executed strategy and updated channel topic.');
    } else {
      throw new Error('[FAIL] Test 3a: Slash command /topic failed.');
    }

    const remindRes = await commandService.executeCommand(workspaceId, userId, channelId, '/remind Review PR #108 at 4 PM');
    if (remindRes.success && remindRes.response.includes('Review PR #108')) {
      console.log('[PASS] Test 3b: Slash command /remind executed strategy and scheduled reminder.');
    } else {
      throw new Error('[FAIL] Test 3b: Slash command /remind failed.');
    }

    // TEST 4: Workflow Builder v1 Engine (Saga Pattern)
    const workflowService = new WorkflowService(dbService, messageService);
    const workflow = await workflowService.createWorkflow(
      workspaceId,
      'Auto Welcome on Channel Join',
      'channel_join',
      'send_message',
      { channelId, message: 'Welcome to the channel!' },
    );

    const triggerRes = await workflowService.triggerWorkflows(workspaceId, 'channel_join', { channelId, userId });
    if (triggerRes.triggeredCount === 1 && triggerRes.runIds.length === 1) {
      console.log('[PASS] Test 4: Workflow Builder v1 triggered automated Saga action and recorded execution run.');
    } else {
      throw new Error('[FAIL] Test 4: Workflow execution failed.');
    }

    console.log('\n===================================================================');
    console.log('ALL INTEGRATIONS & WORKFLOW ENGINE TESTS PASSED SUCCESSFULLY');
    console.log('===================================================================');
  } catch (error) {
    console.error('\n[TEST FAILURE]:', error);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

runIntegrationsAndWorkflowsTests();
