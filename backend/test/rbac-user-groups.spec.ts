import { newDb, DataType } from 'pg-mem';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../src/database/database.service';
import { UserGroupService } from '../src/user-group/user-group.service';
import { PermissionsGuard } from '../src/auth/permissions.guard';
import { Reflector } from '@nestjs/core';
import { ForbiddenException, ExecutionContext } from '@nestjs/common';

async function runRbacAndUserGroupsTests() {
  console.log('===================================================================');
  console.log('RUNNING GRANULAR RBAC & USER GROUPS INTEGRATION TEST SUITE');
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
    const adminUserId = '10000000-0000-0000-0000-000000000001';
    const guestUserId = '20000000-0000-0000-0000-000000000002';

    await client.query(`INSERT INTO tenants (id, name, domain) VALUES ('${tenantId}', 'Acme', 'acme.com');`);
    await client.query(`INSERT INTO workspaces (id, tenant_id, name, slug) VALUES ('${workspaceId}', '${tenantId}', 'WS A', 'ws-a');`);
    await client.query(`INSERT INTO users (id, email, full_name) VALUES ('${adminUserId}', 'admin@acme.com', 'Admin User');`);
    await client.query(`INSERT INTO users (id, email, full_name) VALUES ('${guestUserId}', 'guest@acme.com', 'Guest User');`);

    await client.query(`INSERT INTO workspace_memberships (id, workspace_id, user_id, role) VALUES (gen_random_uuid(), '${workspaceId}', '${adminUserId}', 'WorkspaceAdmin');`);
    await client.query(`INSERT INTO workspace_memberships (id, workspace_id, user_id, role) VALUES (gen_random_uuid(), '${workspaceId}', '${guestUserId}', 'SingleChannelGuest');`);

    // TEST 1: User Group Creation & Group Mention Resolution
    const userGroupService = new UserGroupService(dbService);
    const engGroup = await userGroupService.createGroup(
      workspaceId,
      'Engineering Team',
      '@engineering',
      'Core engineering members',
    );

    if (engGroup.handle === 'engineering' && engGroup.name === 'Engineering Team') {
      console.log('[PASS] Test 1a: User group @engineering created.');
    } else {
      throw new Error('[FAIL] Test 1a: Group creation failed.');
    }

    await userGroupService.addMember(workspaceId, engGroup.id, adminUserId);
    await userGroupService.addMember(workspaceId, engGroup.id, guestUserId);

    const groupUserIds = await userGroupService.resolveGroupMentions(workspaceId, 'engineering');
    if (groupUserIds.length === 2 && groupUserIds.includes(adminUserId) && groupUserIds.includes(guestUserId)) {
      console.log('[PASS] Test 1b: Resolved group mention @engineering to member user IDs.');
    } else {
      throw new Error(`[FAIL] Test 1b: Mention resolution failed. Count: ${groupUserIds.length}`);
    }

    // TEST 2: RBAC Permissions Guard Evaluation
    const reflector = new Reflector();
    const guard = new PermissionsGuard(reflector, dbService);

    // Mock Execution Context for Admin User
    const createMockContext = (userId: string, requiredRoles: string[]) => {
      reflector.getAllAndOverride = () => requiredRoles as any;
      return {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {
              'x-workspace-id': workspaceId,
              'x-user-id': userId,
            },
          }),
        }),
      } as unknown as ExecutionContext;
    };

    const adminAllowed = await guard.canActivate(createMockContext(adminUserId, ['WorkspaceAdmin']));
    if (adminAllowed) {
      console.log('[PASS] Test 2a: WorkspaceAdmin permitted for admin endpoints.');
    } else {
      throw new Error('[FAIL] Test 2a: Admin access denied.');
    }

    try {
      await guard.canActivate(createMockContext(guestUserId, ['WorkspaceAdmin']));
      throw new Error('[FAIL] Test 2b: SingleChannelGuest improperly allowed admin access!');
    } catch (err) {
      if (err instanceof ForbiddenException) {
        console.log('[PASS] Test 2b: SingleChannelGuest correctly blocked from admin endpoint with ForbiddenException.');
      } else {
        throw err;
      }
    }

    console.log('\n===================================================================');
    console.log('ALL GRANULAR RBAC & USER GROUPS TESTS PASSED SUCCESSFULLY');
    console.log('===================================================================');
  } catch (error) {
    console.error('\n[TEST FAILURE]:', error);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

runRbacAndUserGroupsTests();
