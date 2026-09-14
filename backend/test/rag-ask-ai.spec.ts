import { newDb, DataType } from 'pg-mem';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../src/database/database.service';
import { AmazonOpenSearchAdapter } from '../src/opensearch/opensearch.adapter';
import { OpenSearchService } from '../src/opensearch/opensearch.service';
import { ClaudeLLMProvider } from '../src/ai/providers/claude-llm.provider';
import { LLMGatewayService } from '../src/ai/llm-gateway.service';
import { VectorStoreService } from '../src/ai/vector-store.service';
import { RAGRetrievalService } from '../src/ai/rag-retrieval.service';
import { AskAIService } from '../src/ai/ask-ai.service';
import { CommandService } from '../src/command/command.service';
import { AskAICommandStrategy } from '../src/command/strategies/ask-ai-command.strategy';

async function runRAGAndAskAITests() {
  console.log('===================================================================');
  console.log('RUNNING RAG HYBRID RETRIEVAL (RRF) & /ask-ai SERVICE TEST SUITE');
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
    await client.query(`INSERT INTO messages (id, workspace_id, channel_id, sender_id, content) VALUES ('${messageId}', '${workspaceId}', '${channelId}', '${userId}', 'The deployment for release v2.5 is scheduled for tonight at 10 PM UTC.');`);

    const openSearchAdapter = new AmazonOpenSearchAdapter();
    const openSearchService = new OpenSearchService(openSearchAdapter);
    await openSearchService.indexMessageAsync({
      id: messageId,
      workspaceId,
      channelId,
      senderId: userId,
      content: 'The deployment for release v2.5 is scheduled for tonight at 10 PM UTC.',
      createdAt: new Date().toISOString(),
    });

    const claudeProvider = new ClaudeLLMProvider();
    const llmGateway = new LLMGatewayService([claudeProvider]);

    const vectorStore = new VectorStoreService(dbService, llmGateway);
    await vectorStore.indexMessage(
      workspaceId,
      messageId,
      'The deployment for release v2.5 is scheduled for tonight at 10 PM UTC.',
    );

    // TEST 1: Reciprocal Rank Fusion (RRF) Hybrid Search
    const ragRetrieval = new RAGRetrievalService(openSearchService, vectorStore);
    const hybridResults = await ragRetrieval.hybridSearch(workspaceId, 'deployment release v2.5');

    if (hybridResults.length === 1 && hybridResults[0].messageId === messageId && hybridResults[0].rrfScore > 0) {
      console.log('[PASS] Test 1: Reciprocal Rank Fusion (RRF) successfully merged OpenSearch and Vector results.');
    } else {
      throw new Error(`[FAIL] Test 1: Hybrid retrieval failed. Results: ${hybridResults.length}`);
    }

    // TEST 2: Agentic /ask-ai Question Answering & Markdown Citations
    const askAIService = new AskAIService(ragRetrieval, llmGateway);
    const askRes = await askAIService.askAI(workspaceId, userId, 'When is the release deployment?');

    if (
      askRes.answer.includes('Sources & Citations') &&
      askRes.citations.length === 1 &&
      askRes.citations[0].messageId === messageId
    ) {
      console.log('[PASS] Test 2: AskAIService generated answer with explicit source markdown citations.');
    } else {
      throw new Error('[FAIL] Test 2: AskAIService response invalid or citations missing.');
    }

    // TEST 3: Slash Command /ask-ai Strategy Routing
    const askAIStrategy = new AskAICommandStrategy(askAIService);
    const commandService = new CommandService([askAIStrategy]);

    const cmdRes = await commandService.executeCommand(
      workspaceId,
      userId,
      channelId,
      '/ask-ai When is the deployment?',
    );

    if (cmdRes.success && cmdRes.response.includes('Sources & Citations')) {
      console.log('[PASS] Test 3: Slash command /ask-ai executed strategy and returned citation-backed response.');
    } else {
      throw new Error('[FAIL] Test 3: Slash command /ask-ai failed.');
    }

    console.log('\n===================================================================');
    console.log('ALL RAG HYBRID SEARCH & /ask-ai TESTS PASSED SUCCESSFULLY');
    console.log('===================================================================');
  } catch (error) {
    console.error('\n[TEST FAILURE]:', error);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

runRAGAndAskAITests();
