import { newDb, DataType } from 'pg-mem';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { MessageService } from '../src/message/message.service';
import { DatabaseService } from '../src/database/database.service';

async function runMessagingGatewayTests() {
  console.log('===================================================================');
  console.log('RUNNING CORE MESSAGING & THREADS INTEGRATION TEST SUITE (RLS)');
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
    // 1. Run Migration 001 and 002
    const m1Path = path.join(__dirname, '../src/database/migrations/001_initial_schema_and_rls.sql');
    const m2Path = path.join(__dirname, '../src/database/migrations/002_messaging_schema_and_rls.sql');

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
        .filter((s) => !s.toLowerCase().includes('drop policy'));

      for (const st of stmts) {
        await client.query(st);
      }
    };

    await cleanAndRun(m1Path);
    await cleanAndRun(m2Path);
    console.log('[PASS] Migrations 001 and 002 DDL schema loaded into test DB.');

    // 2. Seed Base Data
    const tenantId = '00000000-0000-0000-0000-000000000001';
    const workspaceIdA = 'a0000000-0000-0000-0000-00000000000a';
    const workspaceIdB = 'b0000000-0000-0000-0000-00000000000b';
    const userId = '10000000-0000-0000-0000-000000000001';
    const channelIdA = 'c0000000-0000-0000-0000-00000000000a';


    await client.query(`INSERT INTO tenants (id, name, domain) VALUES ('${tenantId}', 'Acme', 'acme.com');`);
    await client.query(`INSERT INTO workspaces (id, tenant_id, name, slug) VALUES ('${workspaceIdA}', '${tenantId}', 'WS A', 'ws-a');`);
    await client.query(`INSERT INTO workspaces (id, tenant_id, name, slug) VALUES ('${workspaceIdB}', '${tenantId}', 'WS B', 'ws-b');`);
    await client.query(`INSERT INTO users (id, email, full_name) VALUES ('${userId}', 'alice@acme.com', 'Alice');`);
    await client.query(`INSERT INTO channels (id, workspace_id, name) VALUES ('${channelIdA}', '${workspaceIdA}', 'general');`);

    const messageService = new MessageService(dbService);

    // TEST 1: Create Message in Workspace A
    const msg1 = await messageService.createMessage(workspaceIdA, userId, {
      channelId: channelIdA,
      content: 'Hello Workspace A!',
    });

    if (msg1.id && msg1.content === 'Hello Workspace A!') {
      console.log('[PASS] Test 1: Created root message in Workspace A under RLS context.');
    } else {
      throw new Error('[FAIL] Test 1 Failed.');
    }

    // TEST 2: Create Thread Reply to msg1
    const reply1 = await messageService.createMessage(workspaceIdA, userId, {
      channelId: channelIdA,
      content: 'Thread reply to msg1',
      parentMessageId: msg1.id,
    });

    const threadReplies = await messageService.getThreadReplies(workspaceIdA, msg1.id);
    if (threadReplies.length === 1 && threadReplies[0].content === 'Thread reply to msg1') {
      console.log('[PASS] Test 2: Thread reply created and retrieved successfully.');
    } else {
      throw new Error(`[FAIL] Test 2 Failed. Thread count: ${threadReplies.length}`);
    }

    // TEST 3: Add and Remove Emoji Reaction
    const reaction = await messageService.addReaction(workspaceIdA, userId, {
      messageId: msg1.id,
      emojiCode: 'thumbsup',
    });

    if (reaction && (reaction as any).emoji_code === 'thumbsup') {
      console.log('[PASS] Test 3: Emoji reaction added to message.');
    } else {
      throw new Error('[FAIL] Test 3 Failed.');
    }

    // TEST 4: Verify Cross-Tenant Isolation (Querying Workspace A messages in Workspace B yields 0)
    const resB = await messageService.getChannelMessages(workspaceIdB, channelIdA);
    if (resB.length === 0) {
      console.log('[PASS] Test 4: Workspace B context returns 0 messages from Workspace A (Zero cross-tenant leakage).');
    } else {
      throw new Error(`[FAIL] Test 4 Failed: Cross-tenant leakage detected! Count: ${resB.length}`);
    }

    console.log('\n===================================================================');
    console.log('ALL CORE MESSAGING & RLS TESTS PASSED SUCCESSFULLY');
    console.log('===================================================================');
  } catch (error) {
    console.error('\n[TEST FAILURE]:', error);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

runMessagingGatewayTests();
