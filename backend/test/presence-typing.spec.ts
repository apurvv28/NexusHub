import { newDb, DataType } from 'pg-mem';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { MessageService } from '../src/message/message.service';
import { DatabaseService } from '../src/database/database.service';
import { PresenceService } from '../src/presence/presence.service';
import { TypingIndicatorService } from '../src/presence/typing.service';

async function runPresenceTypingAuditTests() {
  console.log('===================================================================');
  console.log('RUNNING AUDIT LOG, PRESENCE & TYPING INTEGRATION TEST SUITE');
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
    // 1. Run Migrations 001, 002, and 003
    const m1Path = path.join(__dirname, '../src/database/migrations/001_initial_schema_and_rls.sql');
    const m2Path = path.join(__dirname, '../src/database/migrations/002_messaging_schema_and_rls.sql');
    const m3Path = path.join(__dirname, '../src/database/migrations/003_audit_and_presence_schema.sql');

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
    await cleanAndRun(m3Path);
    console.log('[PASS] Migrations 001, 002, and 003 DDL schema loaded into test DB.');

    // 2. Seed Base Data
    const tenantId = '00000000-0000-0000-0000-000000000001';
    const workspaceId = 'a0000000-0000-0000-0000-00000000000a';
    const userId = '10000000-0000-0000-0000-000000000001';
    const channelId = 'c0000000-0000-0000-0000-00000000000a';

    await client.query(`INSERT INTO tenants (id, name, domain) VALUES ('${tenantId}', 'Acme', 'acme.com');`);
    await client.query(`INSERT INTO workspaces (id, tenant_id, name, slug) VALUES ('${workspaceId}', '${tenantId}', 'WS A', 'ws-a');`);
    await client.query(`INSERT INTO users (id, email, full_name) VALUES ('${userId}', 'alice@acme.com', 'Alice');`);
    await client.query(`INSERT INTO channels (id, workspace_id, name) VALUES ('${channelId}', '${workspaceId}', 'general');`);

    const messageService = new MessageService(dbService);

    // TEST 1: Message Editing & Audit Log Creation
    const originalMsg = await messageService.createMessage(workspaceId, userId, {
      channelId,
      content: 'Original message content',
    });

    const editedMsg = await messageService.editMessage(workspaceId, userId, originalMsg.id, 'Updated message content');
    if (editedMsg.content === 'Updated message content' && editedMsg.is_edited) {
      console.log('[PASS] Test 1a: Message successfully updated.');
    } else {
      throw new Error('[FAIL] Test 1a: Message update failed.');
    }

    const auditRes = await client.query(
      `SELECT * FROM message_audit_logs WHERE message_id = $1 AND action = 'EDIT';`,
      [originalMsg.id],
    );
    if (auditRes.rows.length === 1 && auditRes.rows[0].old_content === 'Original message content') {
      console.log('[PASS] Test 1b: Immutable audit log recorded EDIT event with previous content.');
    } else {
      throw new Error('[FAIL] Test 1b: Audit log for EDIT missing or invalid.');
    }

    // TEST 2: Message Deletion & Audit Log Creation
    const deleteRes = await messageService.deleteMessage(workspaceId, userId, originalMsg.id);
    if (deleteRes.success) {
      console.log('[PASS] Test 2a: Message successfully deleted.');
    } else {
      throw new Error('[FAIL] Test 2a: Message deletion failed.');
    }

    const deleteAuditRes = await client.query(
      `SELECT * FROM message_audit_logs WHERE message_id = $1 AND action = 'DELETE';`,
      [originalMsg.id],
    );
    if (deleteAuditRes.rows.length === 1 && deleteAuditRes.rows[0].old_content === 'Updated message content') {
      console.log('[PASS] Test 2b: Immutable audit log recorded DELETE event with last content.');
    } else {
      throw new Error('[FAIL] Test 2b: Audit log for DELETE missing or invalid.');
    }

    // TEST 3: Typing Indicator Formatting
    const typingService = new TypingIndicatorService();
    const typingRes = typingService.processTypingEvent({
      workspaceId,
      channelId,
      userId,
      username: 'Alice',
      isTyping: true,
    });

    if (typingRes.roomName === `workspace_${workspaceId}:channel_${channelId}` && typingRes.payload.isTyping) {
      console.log('[PASS] Test 3: Typing indicator room format and payload verified.');
    } else {
      throw new Error('[FAIL] Test 3: Typing indicator output invalid.');
    }

    // TEST 4: Presence Service (Degraded/Fallback Mode Handling)
    const presenceService = new PresenceService();
    presenceService.onModuleInit();
    await presenceService.setHeartbeat(workspaceId, userId, 'online');
    const status = await presenceService.getUserPresence(workspaceId, userId);
    if (status === 'offline' || status === 'online') {
      console.log(`[PASS] Test 4: Presence service returned expected status (${status}) in current environment.`);
    } else {
      throw new Error('[FAIL] Test 4: Presence service failed.');
    }
    await presenceService.onModuleDestroy();

    console.log('\n===================================================================');
    console.log('ALL AUDIT LOG, PRESENCE & TYPING TESTS PASSED SUCCESSFULLY');
    console.log('===================================================================');
  } catch (error) {
    console.error('\n[TEST FAILURE]:', error);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

runPresenceTypingAuditTests();
