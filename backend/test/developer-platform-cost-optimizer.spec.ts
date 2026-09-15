import { DeveloperPlatformService } from '../src/developer-platform/developer-platform.service';
import { CostOptimizerService } from '../src/cost-optimizer/cost-optimizer.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

async function runDeveloperPlatformCostOptimizerTests() {
  console.log('===================================================================');
  console.log('RUNNING PHASE 6: DEVELOPER PLATFORM & COST OPTIMIZER TEST SUITE');
  console.log('===================================================================\n');

  try {
    const workspaceIdA = 'a0000000-0000-0000-0000-00000000000a';
    const userId1 = '10000000-0000-0000-0000-000000000001';

    // -----------------------------------------------------------------
    // TEST 1: Developer Application Registration & OAuth 2.0 Auth Code
    // -----------------------------------------------------------------
    const devService = new DeveloperPlatformService();

    const app = await devService.registerApp(
      workspaceIdA,
      userId1,
      'GitHub Release Bot',
      'Post release summaries to channel',
      ['https://github.com/oauth/callback'],
      ['read:messages', 'write:messages'],
    );

    if (
      app.name === 'GitHub Release Bot' &&
      app.clientId.startsWith('nx_client_') &&
      app.clientSecret.startsWith('nx_secret_') &&
      app.allowedScopes.includes('write:messages')
    ) {
      console.log('[PASS] Test 1a: Registered 3rd-party developer application with OAuth 2.0 Client ID & Secret.');
    } else {
      throw new Error('[FAIL] Test 1a: Developer app registration failed.');
    }

    // Issue OAuth 2.0 Authorization Code
    const authCode = await devService.issueAuthCode(app.clientId, userId1, workspaceIdA, ['read:messages', 'write:messages']);
    if (authCode.startsWith('nx_code_')) {
      console.log('[PASS] Test 1b: Issued OAuth 2.0 Authorization Code for user consent flow.');
    } else {
      throw new Error('[FAIL] Test 1b: Authorization Code issuance failed.');
    }

    // Exchange Authorization Code for Access Token
    const tokenRes = await devService.exchangeToken('authorization_code', app.clientId, app.clientSecret, authCode);
    if (
      tokenRes.accessToken.startsWith('nx_at_') &&
      tokenRes.tokenType === 'Bearer' &&
      tokenRes.expiresIn === 3600 &&
      tokenRes.scope === 'read:messages write:messages'
    ) {
      console.log('[PASS] Test 1c: Exchanged Authorization Code for Bearer Access Token with scoped permissions.');
    } else {
      throw new Error('[FAIL] Test 1c: OAuth token exchange failed.');
    }

    // Client Credentials Grant Flow
    const clientCredsToken = await devService.exchangeToken('client_credentials', app.clientId, app.clientSecret);
    if (clientCredsToken.accessToken.startsWith('nx_at_')) {
      console.log('[PASS] Test 1d: Exchanged Client Credentials for M2M machine-to-machine bot access token.');
    } else {
      throw new Error('[FAIL] Test 1d: Client Credentials grant flow failed.');
    }

    // OpenAPI 3.0 Specification Generation
    const openApiSpec = devService.generateOpenAPISpec();
    if (openApiSpec.openapi === '3.0.3' && openApiSpec.paths['/messages']) {
      console.log('[PASS] Test 1e: OpenAPI 3.0 JSON Specification generated successfully for public API portal.');
    } else {
      throw new Error('[FAIL] Test 1e: OpenAPI specification generation failed.');
    }

    // -----------------------------------------------------------------
    // TEST 2: AWS Compute Optimizer & Infrastructure Unit Cost Reduction
    // -----------------------------------------------------------------
    const costService = new CostOptimizerService();

    const recommendations = await costService.getComputeRecommendations(workspaceIdA);
    if (
      recommendations.length === 2 &&
      recommendations.some((r) => r.resourceType === 'ECS_FARGATE') &&
      recommendations.some((r) => r.resourceType === 'AURORA_POSTGRES')
    ) {
      console.log('[PASS] Test 2a: AWS Compute Optimizer right-sizing recommendations generated for Fargate & Aurora.');
    } else {
      throw new Error('[FAIL] Test 2a: Compute recommendations failed.');
    }

    // S3 Glacier Lifecycle Storage Worker Execution
    const s3Result = await costService.executeS3GlacierLifecycleWorker(workspaceIdA);
    if (
      s3Result.evaluatedFilesCount === 1450 &&
      s3Result.transitionedGlacierIRCount === 320 &&
      s3Result.transitionedDeepArchiveCount === 110 &&
      s3Result.monthlyStorageSavingsUSD > 0
    ) {
      console.log(`[PASS] Test 2b: S3 Glacier Lifecycle Worker transitioned 430 files older than 90 days (\$${s3Result.monthlyStorageSavingsUSD}/mo savings).`);
    } else {
      throw new Error('[FAIL] Test 2b: S3 Glacier lifecycle transition worker failed.');
    }

    // Infrastructure Unit Cost Reduction Verification (>= 25%)
    const savingsSummary = await costService.getSavingsSummary(workspaceIdA);
    if (
      savingsSummary.unitCostReductionPercentage >= 25.0 &&
      savingsSummary.savingsPlanActive === true &&
      savingsSummary.totalMonthlySavingsUSD > 500
    ) {
      console.log(`[PASS] Test 2c: Infrastructure unit cost reduction per seat verified at ${savingsSummary.unitCostReductionPercentage}% (>= 25.0% target).`);
    } else {
      throw new Error('[FAIL] Test 2c: Unit cost reduction target check failed.');
    }

    console.log('\n===================================================================');
    console.log('ALL PHASE 6 DEVELOPER PLATFORM & COST OPTIMIZER TESTS PASSED!');
    console.log('===================================================================');
  } catch (error) {
    console.error('\n[TEST FAILURE]:', error);
    process.exit(1);
  }
}

runDeveloperPlatformCostOptimizerTests();
