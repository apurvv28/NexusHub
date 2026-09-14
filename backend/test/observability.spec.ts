import { StructuredLogger } from '../src/observability/logger.service';
import { SentryExceptionFilter } from '../src/observability/sentry.filter';
import { HttpException, HttpStatus } from '@nestjs/common';

async function runObservabilityTests() {
  console.log('===================================================================');
  console.log('RUNNING OBSERVABILITY & STRUCTURED LOGGING TEST SUITE');
  console.log('===================================================================\n');

  try {
    // TEST 1: Structured Logger Formatting
    const logger = new StructuredLogger();
    logger.setContext('TestContext');

    let capturedOutput = '';
    const originalLog = console.log;
    console.log = (msg: string) => {
      capturedOutput = msg;
    };

    process.env.STRUCTURED_LOGS = 'true';
    logger.log('Test structured message payload');
    console.log = originalLog;

    const parsedLog = JSON.parse(capturedOutput);
    if (
      parsedLog.level === 'INFO' &&
      parsedLog.context === 'TestContext' &&
      parsedLog.message === 'Test structured message payload' &&
      parsedLog.timestamp
    ) {
      console.log('[PASS] Test 1: StructuredLogger formats output as valid JSON with timestamp, level, context, and message.');
    } else {
      throw new Error(`[FAIL] Test 1 Failed: Structured log JSON payload invalid: ${capturedOutput}`);
    }

    // TEST 2: Sentry Exception Filter Formatting
    const filter = new SentryExceptionFilter();
    let sentStatusCode = 0;
    let sentBody: any = null;

    const mockResponse = {
      status: (code: number) => {
        sentStatusCode = code;
        return {
          json: (body: any) => {
            sentBody = body;
          },
        };
      },
    };

    const mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => ({ method: 'GET', url: '/api/v1/test-endpoint' }),
      }),
    } as any;

    const testException = new HttpException('Access Denied to Workspace', HttpStatus.FORBIDDEN);
    filter.catch(testException, mockHost);

    if (
      sentStatusCode === 403 &&
      sentBody.statusCode === 403 &&
      sentBody.path === '/api/v1/test-endpoint' &&
      sentBody.message === 'Access Denied to Workspace'
    ) {
      console.log('[PASS] Test 2: SentryExceptionFilter intercepts HttpException and returns structured error payload.');
    } else {
      throw new Error(`[FAIL] Test 2 Failed: Unexpected exception response payload: ${JSON.stringify(sentBody)}`);
    }

    console.log('\n===================================================================');
    console.log('ALL OBSERVABILITY & STRUCTURED LOGGING TESTS PASSED');
    console.log('===================================================================');
  } catch (error) {
    console.error('\n[TEST FAILURE]:', error);
    process.exit(1);
  }
}

runObservabilityTests();
