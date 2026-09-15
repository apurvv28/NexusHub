import { WSShardingService } from '../src/ws-sharding/ws-sharding.service';
import { MobilePushService } from '../src/mobile-push/mobile-push.service';
import { BadRequestException } from '@nestjs/common';

async function runWSShardingMobilePushTests() {
  console.log('===================================================================');
  console.log('RUNNING PHASE 6: WEBSOCKET SHARDING & MOBILE PUSH TEST SUITE');
  console.log('===================================================================\n');

  try {
    const workspaceIdA = 'a0000000-0000-0000-0000-00000000000a';
    const workspaceIdB = 'b0000000-0000-0000-0000-00000000000b';
    const userId1 = '10000000-0000-0000-0000-000000000001';
    const userId2 = '20000000-0000-0000-0000-000000000002';

    // -----------------------------------------------------------------
    // TEST 1: WebSocket Gateway Consistent Hash Ring Sharding Router
    // -----------------------------------------------------------------
    const shardingService = new WSShardingService();

    const clusterNodes = shardingService.getClusterNodes();
    if (clusterNodes.length === 3 && clusterNodes.every((n) => n.status === 'healthy')) {
      console.log('[PASS] Test 1a: Gateway cluster initialized with 3 active gateway nodes in Hash Ring.');
    } else {
      throw new Error('[FAIL] Test 1a: Cluster node initialization failed.');
    }

    // Route connections for multiple users
    const routedNode1 = shardingService.routeConnection(workspaceIdA, userId1);
    const routedNode2 = shardingService.routeConnection(workspaceIdA, userId2);

    if (routedNode1.nodeId && routedNode2.nodeId) {
      console.log(`[PASS] Test 1b: User 1 routed to '${routedNode1.nodeId}', User 2 routed to '${routedNode2.nodeId}'.`);
    } else {
      throw new Error('[FAIL] Test 1b: Connection routing failed.');
    }

    // Verify Sticky Socket Routing Consistency
    const reRoutedNode1 = shardingService.routeConnection(workspaceIdA, userId1);
    if (reRoutedNode1.nodeId === routedNode1.nodeId) {
      console.log('[PASS] Test 1c: Consistent Hash Ring guaranteed STICKY socket routing to same gateway node.');
    } else {
      throw new Error('[FAIL] Test 1c: Sticky socket routing consistency check failed.');
    }

    // -----------------------------------------------------------------
    // TEST 2: k6 Distributed 100,000 Connection Performance Load Simulation
    // -----------------------------------------------------------------
    const k6Result = await shardingService.runK6Simulation(100000);

    if (
      k6Result.status === 'passed' &&
      k6Result.activeConnections === 100000 &&
      k6Result.p95LatencyMs < 200 &&
      k6Result.throughputMsgPerSec >= 10000
    ) {
      console.log(`[PASS] Test 2: k6 Load Test Simulation sustained ${k6Result.activeConnections.toLocaleString()} sockets at ${k6Result.throughputMsgPerSec} msg/sec throughput (p95: ${k6Result.p95LatencyMs}ms).`);
    } else {
      throw new Error('[FAIL] Test 2: k6 100k socket load simulation failed.');
    }

    // -----------------------------------------------------------------
    // TEST 3: Mobile Push Notification APNs & FCM Gateway
    // -----------------------------------------------------------------
    const pushService = new MobilePushService();

    // Register iOS APNs token
    const iosReg = await pushService.registerDeviceToken(
      workspaceIdA,
      userId1,
      'apns_token_ios_device_123456789',
      'ios',
      '1.2.0',
    );

    // Register Android FCM token
    const androidReg = await pushService.registerDeviceToken(
      workspaceIdA,
      userId1,
      'fcm_token_android_device_987654321',
      'android',
      '1.2.0',
    );

    const userDevices = await pushService.getUserDevices(userId1);
    if (userDevices.length === 2 && iosReg.platform === 'ios' && androidReg.platform === 'android') {
      console.log('[PASS] Test 3a: Dual APNs (iOS) & FCM (Android) device tokens registered for user.');
    } else {
      throw new Error('[FAIL] Test 3a: Mobile device registration failed.');
    }

    // Verify Deep Link URI Generation
    const channelDeepLink = pushService.generateDeepLink('channel_eng_general');
    const threadDeepLink = pushService.generateDeepLink('channel_eng_general', 'thread_msg_99');

    if (
      channelDeepLink === 'nexushub://channel/channel_eng_general' &&
      threadDeepLink === 'nexushub://channel/channel_eng_general/thread/thread_msg_99'
    ) {
      console.log('[PASS] Test 3b: Standardized mobile deep-link URI scheme generated correctly.');
    } else {
      throw new Error('[FAIL] Test 3b: Deep-link generation failed.');
    }

    // Send Mobile Push Notification
    const dispatchResult = await pushService.sendPushNotification(workspaceIdA, userId1, {
      title: 'New Message in #engineering-general',
      body: 'Consistent Hash Ring sharded WebSocket nodes sustain 100k active connections!',
      channelId: 'channel_eng_general',
      channelName: 'engineering-general',
      threadId: 'thread_msg_99',
      senderName: 'Sarah Chen',
    });

    if (
      dispatchResult.deliveredCount === 2 &&
      dispatchResult.apnsDispatched &&
      dispatchResult.fcmDispatched &&
      dispatchResult.deepLinkUri === threadDeepLink
    ) {
      console.log('[PASS] Test 3c: Mobile push notification dispatched simultaneously to APNs & FCM with deep-link URI.');
    } else {
      throw new Error('[FAIL] Test 3c: Push notification dispatch failed.');
    }

    // Error handling check for invalid token
    let caughtInvalidTokenError = false;
    try {
      await pushService.registerDeviceToken(workspaceIdA, userId1, '   ', 'ios');
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        caughtInvalidTokenError = true;
      }
    }

    if (caughtInvalidTokenError) {
      console.log('[PASS] Test 3d: Invalid device token correctly rejected with BadRequestException.');
    } else {
      throw new Error('[FAIL] Test 3d: Invalid token check failed.');
    }

    console.log('\n===================================================================');
    console.log('ALL PHASE 6 WEBSOCKET SHARDING & MOBILE PUSH TESTS PASSED!');
    console.log('===================================================================');
  } catch (error) {
    console.error('\n[TEST FAILURE]:', error);
    process.exit(1);
  }
}

runWSShardingMobilePushTests();
