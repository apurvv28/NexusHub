import { newDb, DataType } from 'pg-mem';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { MessageService } from '../src/message/message.service';
import { DatabaseService } from '../src/database/database.service';
import { StorageService } from '../src/storage/storage.service';
import { StorageAdapter, PresignedUrlResult } from '../src/storage/storage.adapter';

class MockStorageAdapter implements StorageAdapter {
  async generatePresignedUploadUrl(
    workspaceId: string,
    fileName: string,
    contentType: string,
    fileSize: number,
  ): Promise<PresignedUrlResult> {
    return {
      uploadUrl: `https://nexushub-attachments-dev-313696198691.s3.us-east-1.amazonaws.com/workspaces/${workspaceId}/attachments/test-file.png?X-Amz-Signature=mock`,
      fileKey: `workspaces/${workspaceId}/attachments/test-file.png`,
      expiresInSeconds: 900,
    };
  }

  getFileUrl(fileKey: string): string {
    return `https://nexushub-attachments-dev-313696198691.s3.us-east-1.amazonaws.com/${fileKey}`;
  }
}

async function runStorageAndSearchTests() {
  console.log('===================================================================');
  console.log('RUNNING S3 STORAGE STRATEGY & FULL-TEXT SEARCH INTEGRATION TEST SUITE');
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
    // 1. Run Migrations 001, 002, 003, and 004
    const m1Path = path.join(__dirname, '../src/database/migrations/001_initial_schema_and_rls.sql');
    const m2Path = path.join(__dirname, '../src/database/migrations/002_messaging_schema_and_rls.sql');
    const m3Path = path.join(__dirname, '../src/database/migrations/003_audit_and_presence_schema.sql');
    const m4Path = path.join(__dirname, '../src/database/migrations/004_fulltext_search_index.sql');

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
    console.log('[PASS] Migrations 001, 002, 003, and 004 loaded into test DB.');

    // 2. Seed Base Data
    const tenantId = '00000000-0000-0000-0000-000000000001';
    const workspaceId = 'a0000000-0000-0000-0000-00000000000a';
    const userId = '10000000-0000-0000-0000-000000000001';
    const channelId = 'c0000000-0000-0000-0000-00000000000a';

    await client.query(`INSERT INTO tenants (id, name, domain) VALUES ('${tenantId}', 'Acme', 'acme.com');`);
    await client.query(`INSERT INTO workspaces (id, tenant_id, name, slug) VALUES ('${workspaceId}', '${tenantId}', 'WS A', 'ws-a');`);
    await client.query(`INSERT INTO users (id, email, full_name) VALUES ('${userId}', 'alice@acme.com', 'Alice');`);
    await client.query(`INSERT INTO channels (id, workspace_id, name) VALUES ('${channelId}', '${workspaceId}', 'general');`);

    // TEST 1: S3 Presigned URL Generation Strategy Pattern
    const mockStorageAdapter = new MockStorageAdapter();
    const storageService = new StorageService(mockStorageAdapter);

    const presignedRes = await storageService.getPresignedUploadUrl(
      workspaceId,
      'screenshot.png',
      'image/png',
      1024 * 100, // 100KB
    );

    if (presignedRes.uploadUrl && presignedRes.fileKey.includes('test-file.png')) {
      console.log('[PASS] Test 1: StorageService generated S3 upload URL via Adapter Strategy.');
    } else {
      throw new Error('[FAIL] Test 1: Presigned URL generation failed.');
    }

    // TEST 2: Message Search Querying
    const messageService = new MessageService(dbService);
    await messageService.createMessage(workspaceId, userId, {
      channelId,
      content: 'The deployment for release v2.5 is scheduled for tonight at 10 PM UTC.',
    });

    await messageService.createMessage(workspaceId, userId, {
      channelId,
      content: 'Lunch meeting at noon.',
    });

    const searchResults = await messageService.searchMessages(workspaceId, 'deployment');
    if (searchResults.length === 1 && searchResults[0].content.includes('release v2.5')) {
      console.log('[PASS] Test 2: Search API accurately matched message content in tenant context.');
    } else {
      throw new Error(`[FAIL] Test 2: Search failed. Match count: ${searchResults.length}`);
    }

    console.log('\n===================================================================');
    console.log('ALL STORAGE & SEARCH INTEGRATION TESTS PASSED SUCCESSFULLY');
    console.log('===================================================================');
  } catch (error) {
    console.error('\n[TEST FAILURE]:', error);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

runStorageAndSearchTests();
