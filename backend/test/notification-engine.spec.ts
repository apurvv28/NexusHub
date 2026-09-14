import { newDb, DataType } from 'pg-mem';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../src/database/database.service';
import { NotificationService } from '../src/notification/notification.service';
import { InAppNotificationChannel } from '../src/notification/channels/in-app-notification.channel';
import { EmailSESNotificationChannel } from '../src/notification/channels/email-ses-notification.channel';
import { PushNotificationChannel } from '../src/notification/channels/push-notification.channel';

async function runNotificationEngineTests() {
  console.log('===================================================================');
  console.log('RUNNING EVENT-DRIVEN MULTI-CHANNEL NOTIFICATION ENGINE TEST SUITE');
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
    // 1. Run Migrations 001 through 005
    const m1Path = path.join(__dirname, '../src/database/migrations/001_initial_schema_and_rls.sql');
    const m2Path = path.join(__dirname, '../src/database/migrations/002_messaging_schema_and_rls.sql');
    const m3Path = path.join(__dirname, '../src/database/migrations/003_audit_and_presence_schema.sql');
    const m4Path = path.join(__dirname, '../src/database/migrations/004_fulltext_search_index.sql');
    const m5Path = path.join(__dirname, '../src/database/migrations/005_rbac_and_notifications_schema.sql');

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
    console.log('[PASS] Migrations 001 through 005 DDL schema loaded into test DB.');

    // 2. Seed Base Data
    const tenantId = '00000000-0000-0000-0000-000000000001';
    const workspaceId = 'a0000000-0000-0000-0000-00000000000a';
    const userId = '10000000-0000-0000-0000-000000000001';
    const mutedChannelId = 'c0000000-0000-0000-0000-00000000000a';

    await client.query(`INSERT INTO tenants (id, name, domain) VALUES ('${tenantId}', 'Acme', 'acme.com');`);
    await client.query(`INSERT INTO workspaces (id, tenant_id, name, slug) VALUES ('${workspaceId}', '${tenantId}', 'WS A', 'ws-a');`);
    await client.query(`INSERT INTO users (id, email, full_name) VALUES ('${userId}', 'alice@acme.com', 'Alice');`);

    const inAppChannel = new InAppNotificationChannel(dbService);
    const emailChannel = new EmailSESNotificationChannel();
    const pushChannel = new PushNotificationChannel();

    const notificationService = new NotificationService(dbService, [
      inAppChannel,
      emailChannel,
      pushChannel,
    ]);

    // TEST 1: Default Notification Preferences & Update
    const defaultPrefs = await notificationService.getPreferences(workspaceId, userId);
    if (defaultPrefs.email_enabled && defaultPrefs.push_enabled) {
      console.log('[PASS] Test 1a: Default notification preferences retrieved.');
    } else {
      throw new Error('[FAIL] Test 1a: Default preferences invalid.');
    }

    await notificationService.updatePreferences(workspaceId, userId, {
      channel_mutes: [mutedChannelId],
      dnd_start: '01:00',
      dnd_end: '02:00',
    });

    const updatedPrefs = await notificationService.getPreferences(workspaceId, userId);
    if (updatedPrefs.channel_mutes.includes(mutedChannelId) && updatedPrefs.dnd_start === '01:00') {
      console.log('[PASS] Test 1b: Notification preferences updated with muted channel and DND schedule.');
    } else {
      throw new Error('[FAIL] Test 1b: Preferences update failed.');
    }

    // TEST 2: Preference Evaluation (Muted Channel & DND Window)
    const evalMuted = notificationService.shouldDeliver(updatedPrefs, mutedChannelId, '14:00');
    if (!evalMuted.deliver && evalMuted.reason?.includes('muted')) {
      console.log('[PASS] Test 2a: Evaluator correctly suppressed notification for muted channel.');
    } else {
      throw new Error('[FAIL] Test 2a: Mute evaluation failed.');
    }

    const evalDnd = notificationService.shouldDeliver(updatedPrefs, undefined, '01:30');
    if (!evalDnd.deliver && evalDnd.reason?.includes('DND')) {
      console.log('[PASS] Test 2b: Evaluator correctly suppressed notification during active DND window.');
    } else {
      throw new Error('[FAIL] Test 2b: DND evaluation failed.');
    }

    // TEST 3: Multi-Channel Strategy Dispatch (OCP)
    const dispatchRes = await notificationService.dispatchNotification(
      workspaceId,
      userId,
      {
        type: 'MENTION',
        title: 'You were mentioned in #general',
        body: '@alice please review PR #42',
      },
      'unmuted_channel_id',
    );

    if (dispatchRes.success && dispatchRes.dispatchedChannels.length === 3) {
      console.log('[PASS] Test 3: Multi-channel strategy dispatched across all 3 channels (in_app, email_ses, push).');
    } else {
      throw new Error(`[FAIL] Test 3: Dispatch failed. Channels: ${dispatchRes.dispatchedChannels.join(', ')}`);
    }

    // TEST 4: Read State Management
    const userNotifs = await notificationService.getUserNotifications(workspaceId, userId);
    if (userNotifs.length === 1 && !userNotifs[0].is_read) {
      console.log('[PASS] Test 4a: In-App notification successfully retrieved from DB.');
    } else {
      throw new Error('[FAIL] Test 4a: Notification retrieval failed.');
    }

    await notificationService.markAsRead(workspaceId, userId, userNotifs[0].id);
    const updatedNotifs = await notificationService.getUserNotifications(workspaceId, userId);
    if (updatedNotifs[0].is_read) {
      console.log('[PASS] Test 4b: Notification marked as read successfully.');
    } else {
      throw new Error('[FAIL] Test 4b: Mark as read failed.');
    }

    console.log('\n===================================================================');
    console.log('ALL EVENT-DRIVEN MULTI-CHANNEL NOTIFICATION TESTS PASSED');
    console.log('===================================================================');
  } catch (error) {
    console.error('\n[TEST FAILURE]:', error);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

runNotificationEngineTests();
