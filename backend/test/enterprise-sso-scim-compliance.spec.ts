import { EnterpriseSSOService } from '../src/enterprise-sso/enterprise-sso.service';
import { AuditLogService } from '../src/audit-compliance/audit-log.service';
import { SIEMExporterService } from '../src/audit-compliance/siem-exporter.service';
import { RetentionWorkerService } from '../src/audit-compliance/retention-worker.service';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';

async function runEnterpriseSSOSCIMComplianceTests() {
  console.log('===================================================================');
  console.log('RUNNING PHASE 5: ENTERPRISE SSO, SCIM 2.0 & COMPLIANCE TEST SUITE');
  console.log('===================================================================\n');

  try {
    const workspaceIdA = 'a0000000-0000-0000-0000-00000000000a';
    const workspaceIdB = 'b0000000-0000-0000-0000-00000000000b';
    const userId1 = '10000000-0000-0000-0000-000000000001';

    // TEST 1: Enterprise SSO (SAML 2.0 / OIDC Configuration)
    const ssoService = new EnterpriseSSOService();
    const config = await ssoService.configureSSO(
      workspaceIdA,
      'okta',
      'urn:nexushub:saml:ws_a',
      'https://dev-okta.com/app/sso',
      '---BEGIN CERTIFICATE---...',
      ['acme.com', 'enterprise.io'],
    );

    if (config.enabled && config.provider === 'okta' && config.allowedDomains.includes('acme.com')) {
      console.log('[PASS] Test 1a: Enterprise SSO (Okta SAML 2.0) configured successfully.');
    } else {
      throw new Error('[FAIL] Test 1a: SSO configuration failed.');
    }

    const samlClaims = await ssoService.validateSAMLAssertion(workspaceIdA, 'PHNhbWxwOlJlc3BvbnNl...');
    if (samlClaims.email && samlClaims.roles.includes('Member')) {
      console.log('[PASS] Test 1b: SAML 2.0 assertion parsed and authenticated user claims.');
    } else {
      throw new Error('[FAIL] Test 1b: SAML assertion validation failed.');
    }

    // TEST 2: SCIM 2.0 User & Group Provisioning (RFC 7644)
    const scimUser = await ssoService.createSCIMUser(workspaceIdA, {
      userName: 'alice.scim@acme.com',
      name: { formatted: 'Alice Smith', givenName: 'Alice', familyName: 'Smith' },
      emails: [{ value: 'alice.scim@acme.com', type: 'work', primary: true }],
      active: true,
      roles: ['WorkspaceAdmin'],
    });

    if (scimUser.id && scimUser.active && scimUser.userName === 'alice.scim@acme.com') {
      console.log('[PASS] Test 2a: SCIM 2.0 user provisioned via RFC 7644 endpoint.');
    } else {
      throw new Error('[FAIL] Test 2a: SCIM user creation failed.');
    }

    const scimGroup = await ssoService.createSCIMGroup(workspaceIdA, 'Engineering Admins', [scimUser.id]);
    if (scimGroup.id && scimGroup.displayName === 'Engineering Admins' && scimGroup.members.length === 1) {
      console.log('[PASS] Test 2b: SCIM 2.0 group provisioned with member mapping.');
    } else {
      throw new Error('[FAIL] Test 2b: SCIM group creation failed.');
    }

    // SCIM Deprovisioning Test (Instant active = false)
    await ssoService.deleteSCIMUser(workspaceIdA, scimUser.id);
    const deprovisionedUser = await ssoService.getSCIMUserById(workspaceIdA, scimUser.id);
    if (!deprovisionedUser.active) {
      console.log('[PASS] Test 2c: SCIM 2.0 instant deprovisioning set user active = false.');
    } else {
      throw new Error('[FAIL] Test 2c: SCIM user deprovisioning failed.');
    }

    // TEST 3: SCIM Tenant Isolation Security Check
    let caughtSCIMTenantError = false;
    try {
      // Querying Workspace A's SCIM user from Workspace B
      await ssoService.getSCIMUserById(workspaceIdB, scimUser.id);
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        caughtSCIMTenantError = true;
      }
    }

    if (caughtSCIMTenantError) {
      console.log('[PASS] Test 3: Cross-tenant SCIM user query correctly blocked with NotFoundException.');
    } else {
      throw new Error('[FAIL] Test 3: SCIM tenant boundary isolation check failed.');
    }

    // TEST 4: Compliance Audit Log Engine
    const auditService = new AuditLogService();
    await auditService.recordEvent(workspaceIdA, userId1, 'SAML SSO Login Success', 'auth', '10.0.1.5');
    await auditService.recordEvent(workspaceIdA, userId1, 'Updated SIEM Exporter Target to Splunk', 'admin', '10.0.1.5');

    const logsA = await auditService.getAuditLogs(workspaceIdA);
    const logsB = await auditService.getAuditLogs(workspaceIdB);

    if (logsA.length === 2 && logsB.length === 0) {
      console.log('[PASS] Test 4: Compliance audit logs recorded with strict workspace tenant scoping.');
    } else {
      throw new Error('[FAIL] Test 4: Audit log recording or tenant isolation failed.');
    }

    // TEST 5: SIEM Exporter Streaming (CEF & JSON formats)
    const siemService = new SIEMExporterService();
    await siemService.configureSIEM(workspaceIdA, 'splunk', 'https://splunk.acme.com:8088/services/collector', 'sec_key_123', 'cef');

    const cefResult = await siemService.streamAuditLog(logsA[0]);
    if (cefResult.streamed && cefResult.payload.includes('CEF:0|NexusHub|AuditEngine')) {
      console.log('[PASS] Test 5: SIEM Exporter formatted audit log to CEF standard and streamed to Splunk.');
    } else {
      throw new Error('[FAIL] Test 5: SIEM export streaming failed.');
    }

    // TEST 6: Message Retention Worker & Legal Hold Override Protection
    const retentionService = new RetentionWorkerService();
    await retentionService.configurePolicy(workspaceIdA, 90, true);

    // Standard run without Legal Hold -> purges expired items
    const normalRun = await retentionService.executeRetentionWorker(workspaceIdA, 100);
    if (normalRun.purgedMessageCount > 0 && normalRun.skippedLegalHoldCount === 0) {
      console.log('[PASS] Test 6a: Retention worker purged expired messages older than 90 days.');
    } else {
      throw new Error('[FAIL] Test 6a: Retention worker purge failed.');
    }

    // Enable Legal Hold -> MUST preserve 100% of data (0 purged!)
    await retentionService.setLegalHold(workspaceIdA, true, 'SEC Investigation #2026');
    const legalHoldRun = await retentionService.executeRetentionWorker(workspaceIdA, 100);

    if (legalHoldRun.purgedMessageCount === 0 && legalHoldRun.skippedLegalHoldCount === 100) {
      console.log('[PASS] Test 6b: LEGAL HOLD OVERRIDE strictly preserved 100% of messages during retention run.');
    } else {
      throw new Error('[FAIL] Test 6b: Legal Hold override protection failed.');
    }

    console.log('\n===================================================================');
    console.log('ALL PHASE 5 ENTERPRISE SSO, SCIM & COMPLIANCE TESTS PASSED!');
    console.log('===================================================================');
  } catch (error) {
    console.error('\n[TEST FAILURE]:', error);
    process.exit(1);
  }
}

runEnterpriseSSOSCIMComplianceTests();
