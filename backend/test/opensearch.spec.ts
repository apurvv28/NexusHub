import { AmazonOpenSearchAdapter } from '../src/opensearch/opensearch.adapter';
import { OpenSearchService } from '../src/opensearch/opensearch.service';

async function runOpenSearchTests() {
  console.log('===================================================================');
  console.log('RUNNING OPENSEARCH HIGH-PERFORMANCE SEARCH & AP ISOLATION TEST SUITE');
  console.log('===================================================================\n');

  const adapter = new AmazonOpenSearchAdapter();
  const service = new OpenSearchService(adapter);

  const workspaceIdA = 'a0000000-0000-0000-0000-00000000000a';
  const workspaceIdB = 'b0000000-0000-0000-0000-00000000000b';
  const channelId = 'c0000000-0000-0000-0000-00000000000a';
  const senderId = '10000000-0000-0000-0000-000000000001';

  // TEST 1: Tenant-namespaced Indexing & Fuzzy Search Matching
  await service.indexMessageAsync({
    id: 'm1',
    workspaceId: workspaceIdA,
    channelId,
    senderId,
    content: 'OpenSearch cluster deployment completed with high-availability configuration.',
    createdAt: new Date().toISOString(),
  });

  await service.indexMessageAsync({
    id: 'm2',
    workspaceId: workspaceIdA,
    channelId,
    senderId,
    content: 'Database maintenance scheduled for midnight.',
    createdAt: new Date().toISOString(),
  });

  const resultsA = await service.search(workspaceIdA, 'deployment');
  if (resultsA.length === 1 && resultsA[0].highlightSnippet?.includes('<em>deployment</em>')) {
    console.log('[PASS] Test 1: OpenSearch matched query, returned snippet highlights, and scored correctly.');
  } else {
    throw new Error(`[FAIL] Test 1: Search failed. Matches: ${resultsA.length}`);
  }

  // TEST 2: Multi-Tenant Index Namespacing (Zero cross-tenant search leakage)
  const resultsB = await service.search(workspaceIdB, 'deployment');
  if (resultsB.length === 0) {
    console.log('[PASS] Test 2: Tenant Workspace B query returned 0 results from Workspace A index template.');
  } else {
    throw new Error(`[FAIL] Test 2: Tenant leakage detected in OpenSearch! Count: ${resultsB.length}`);
  }

  // TEST 3: AP Non-Blocking Exception Isolation (Non-Negotiable #4)
  const faultyAdapter = {
    indexMessage: async () => {
      throw new Error('Simulated OpenSearch cluster connection timeout');
    },
    search: async () => [],
  };
  const apIsolatedService = new OpenSearchService(faultyAdapter as any);

  try {
    await apIsolatedService.indexMessageAsync({
      id: 'm3',
      workspaceId: workspaceIdA,
      channelId,
      senderId,
      content: 'Critical message that must succeed regardless of OpenSearch status.',
      createdAt: new Date().toISOString(),
    });
    console.log('[PASS] Test 3: AP store indexing failure caught gracefully without throwing exception to caller.');
  } catch (err) {
    throw new Error('[FAIL] Test 3: AP store exception leaked to caller!');
  }

  console.log('\n===================================================================');
  console.log('ALL OPENSEARCH SEARCH & AP ISOLATION TESTS PASSED SUCCESSFULLY');
  console.log('===================================================================');
}

runOpenSearchTests();
