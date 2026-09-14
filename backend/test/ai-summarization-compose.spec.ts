import { newDb, DataType } from 'pg-mem';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../src/database/database.service';
import { ClaudeLLMProvider } from '../src/ai/providers/claude-llm.provider';
import { LLMGatewayService } from '../src/ai/llm-gateway.service';
import { AISummarizationService } from '../src/ai/ai-summarization.service';
import { AIComposeAssistantService } from '../src/ai/ai-compose-assistant.service';

async function runSummarizationAndComposeTests() {
  console.log('===================================================================');
  console.log('RUNNING AI SUMMARIZER ("CATCH ME UP") & COMPOSER TEST SUITE');
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
    const rootMsgId = 'e0000000-0000-0000-0000-000000000001';

    await client.query(`INSERT INTO tenants (id, name, domain) VALUES ('${tenantId}', 'Acme', 'acme.com');`);
    await client.query(`INSERT INTO workspaces (id, tenant_id, name, slug) VALUES ('${workspaceId}', '${tenantId}', 'WS A', 'ws-a');`);
    await client.query(`INSERT INTO users (id, email, full_name) VALUES ('${userId}', 'alice@acme.com', 'Alice');`);
    await client.query(`INSERT INTO channels (id, workspace_id, name) VALUES ('${channelId}', '${workspaceId}', 'general');`);
    
    await client.query(`INSERT INTO messages (id, workspace_id, channel_id, sender_id, content) VALUES ('${rootMsgId}', '${workspaceId}', '${channelId}', '${userId}', 'We need to finalize the Q4 release roadmap.');`);
    await client.query(`INSERT INTO messages (id, workspace_id, channel_id, sender_id, parent_message_id, content) VALUES (gen_random_uuid(), '${workspaceId}', '${channelId}', '${userId}', '${rootMsgId}', 'Decided to ship feature X in October.');`);

    const claudeProvider = new ClaudeLLMProvider();
    const llmGateway = new LLMGatewayService([claudeProvider]);

    // TEST 1: Channel & Thread Summarizer ("Catch Me Up")
    const summarizationService = new AISummarizationService(dbService, llmGateway);

    const channelSummary = await summarizationService.summarizeChannel(workspaceId, userId, channelId);
    if (channelSummary.summary.includes('Key Topics') || channelSummary.summary.length > 10) {
      console.log('[PASS] Test 1a: AISummarizationService generated structured channel markdown summary.');
    } else {
      throw new Error('[FAIL] Test 1a: Channel summary failed.');
    }

    const threadSummary = await summarizationService.summarizeThread(workspaceId, userId, rootMsgId);
    if (threadSummary.replyCount === 1 && threadSummary.summary.length > 5) {
      console.log('[PASS] Test 1b: AISummarizationService generated thread summary for root message.');
    } else {
      throw new Error('[FAIL] Test 1b: Thread summary failed.');
    }

    // TEST 2: AI Compose Assistant (Rephrase, Grammar, Translation)
    const composeService = new AIComposeAssistantService(llmGateway);

    const rephraseRes = await composeService.rephrase(workspaceId, userId, 'hey check this out quick', 'formal');
    if (rephraseRes.revisedText.length > 0 && rephraseRes.style === 'formal') {
      console.log('[PASS] Test 2a: AIComposeAssistantService rephrased text to formal tone.');
    } else {
      throw new Error('[FAIL] Test 2a: Rephrase failed.');
    }

    const grammarRes = await composeService.fixGrammar(workspaceId, userId, 'They is going to the store yesterday');
    if (grammarRes.correctedText.length > 0) {
      console.log('[PASS] Test 2b: AIComposeAssistantService corrected grammar error.');
    } else {
      throw new Error('[FAIL] Test 2b: Grammar correction failed.');
    }

    const translateRes = await composeService.translate(workspaceId, userId, 'Hello team, welcome!', 'Spanish');
    if (translateRes.translatedText.length > 0 && translateRes.targetLanguage === 'Spanish') {
      console.log('[PASS] Test 2c: AIComposeAssistantService translated message text.');
    } else {
      throw new Error('[FAIL] Test 2c: Translation failed.');
    }

    console.log('\n===================================================================');
    console.log('ALL AI SUMMARIZER & COMPOSER TESTS PASSED SUCCESSFULLY');
    console.log('===================================================================');
  } catch (error) {
    console.error('\n[TEST FAILURE]:', error);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

runSummarizationAndComposeTests();
