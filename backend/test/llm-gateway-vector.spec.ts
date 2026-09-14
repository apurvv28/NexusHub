import { newDb, DataType } from 'pg-mem';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../src/database/database.service';
import { ClaudeLLMProvider } from '../src/ai/providers/claude-llm.provider';
import { OpenAILLMProvider } from '../src/ai/providers/openai-llm.provider';
import { MockLiteLLMProvider } from '../src/ai/providers/mock-litellm.provider';
import { LLMGatewayService } from '../src/ai/llm-gateway.service';
import { VectorStoreService } from '../src/ai/vector-store.service';

async function runLLMGatewayAndVectorTests() {
  console.log('===================================================================');
  console.log('RUNNING LLM GATEWAY (LSP) & VECTOR STORE INTEGRATION TEST SUITE');
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
    // 1. Run Migrations 001 through 007
    const m1Path = path.join(__dirname, '../src/database/migrations/001_initial_schema_and_rls.sql');
    const m2Path = path.join(__dirname, '../src/database/migrations/002_messaging_schema_and_rls.sql');
    const m3Path = path.join(__dirname, '../src/database/migrations/003_audit_and_presence_schema.sql');
    const m4Path = path.join(__dirname, '../src/database/migrations/004_fulltext_search_index.sql');
    const m5Path = path.join(__dirname, '../src/database/migrations/005_rbac_and_notifications_schema.sql');
    const m6Path = path.join(__dirname, '../src/database/migrations/006_webhooks_and_workflows_schema.sql');
    const m7Path = path.join(__dirname, '../src/database/migrations/007_vector_and_ai_schema.sql');

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
    await cleanAndRun(m7Path);
    console.log('[PASS] Migrations 001 through 007 DDL schema loaded into test DB.');

    // 2. Seed Base Data
    const tenantId = '00000000-0000-0000-0000-000000000001';
    const workspaceId = 'a0000000-0000-0000-0000-00000000000a';
    const userId = '10000000-0000-0000-0000-000000000001';
    const channelId = 'c0000000-0000-0000-0000-00000000000a';
    const messageId = 'e0000000-0000-0000-0000-000000000001';

    await client.query(`INSERT INTO tenants (id, name, domain) VALUES ('${tenantId}', 'Acme', 'acme.com');`);
    await client.query(`INSERT INTO workspaces (id, tenant_id, name, slug) VALUES ('${workspaceId}', '${tenantId}', 'WS A', 'ws-a');`);
    await client.query(`INSERT INTO users (id, email, full_name) VALUES ('${userId}', 'alice@acme.com', 'Alice');`);
    await client.query(`INSERT INTO channels (id, workspace_id, name) VALUES ('${channelId}', '${workspaceId}', 'general');`);
    await client.query(`INSERT INTO messages (id, workspace_id, channel_id, sender_id, content) VALUES ('${messageId}', '${workspaceId}', '${channelId}', '${userId}', 'Architecture document overview');`);

    // TEST 1: Model-Agnostic LLM Gateway & Liskov Substitution Principle (LSP)
    const claudeProvider = new ClaudeLLMProvider();
    const openaiProvider = new OpenAILLMProvider();
    const litellmProvider = new MockLiteLLMProvider();

    const llmGateway = new LLMGatewayService([claudeProvider, openaiProvider, litellmProvider]);

    const resClaude = await llmGateway.generateCompletion('Explain NexusHub RAG');
    if (resClaude.provider.includes('claude') && resClaude.text.includes('Explain NexusHub RAG')) {
      console.log('[PASS] Test 1a: Default Claude provider generated completion.');
    } else {
      throw new Error('[FAIL] Test 1a: Claude completion failed.');
    }

    llmGateway.setActiveProvider('openai');
    const resOpenAI = await llmGateway.generateCompletion('Explain NexusHub RAG');
    if (resOpenAI.provider.includes('gpt-4o')) {
      console.log('[PASS] Test 1b: LSP dynamically substituted active provider to OpenAI smoothly.');
    } else {
      throw new Error('[FAIL] Test 1b: OpenAI substitution failed.');
    }

    // TEST 2: Vector Embedding Ingestion & Cosine Similarity Search
    const vectorStore = new VectorStoreService(dbService, llmGateway);
    const vectorId = await vectorStore.indexMessage(
      workspaceId,
      messageId,
      'Architecture document overview',
    );

    if (vectorId) {
      console.log('[PASS] Test 2a: Vector embedding generated and indexed in database table vector_embeddings.');
    } else {
      throw new Error('[FAIL] Test 2a: Vector indexing failed.');
    }

    const similarityResults = await vectorStore.similaritySearch(workspaceId, 'Architecture document');
    if (similarityResults.length === 1 && similarityResults[0].messageId === messageId) {
      console.log('[PASS] Test 2b: Tenant-scoped similarity search returned matched message chunk.');
    } else {
      throw new Error(`[FAIL] Test 2b: Similarity search failed. Count: ${similarityResults.length}`);
    }

    console.log('\n===================================================================');
    console.log('ALL LLM GATEWAY & VECTOR STORE TESTS PASSED SUCCESSFULLY');
    console.log('===================================================================');
  } catch (error) {
    console.error('\n[TEST FAILURE]:', error);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

runLLMGatewayAndVectorTests();
