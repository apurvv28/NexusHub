import { HuddleService } from '../src/huddle/huddle.service';
import { TranscriptionService } from '../src/huddle/transcription.service';
import { HuddleRecapService } from '../src/huddle/huddle-recap.service';
import { HuddleGateway } from '../src/huddle/huddle.gateway';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';

async function runWebRTCHuddleTranscriptionTests() {
  console.log('===================================================================');
  console.log('RUNNING PHASE 4: WEBRTC HUDDLE & AI AUDIO TRANSCRIPTION TEST SUITE');
  console.log('===================================================================\n');

  try {
    const workspaceIdA = 'a0000000-0000-0000-0000-00000000000a';
    const workspaceIdB = 'b0000000-0000-0000-0000-00000000000b';
    const channelId = 'c0000000-0000-0000-0000-00000000000a';
    const userId1 = '10000000-0000-0000-0000-000000000001';
    const userId2 = '20000000-0000-0000-0000-000000000002';

    const huddleService = new HuddleService();
    const transcriptionService = new TranscriptionService(huddleService);

    // Mock MessageService for auto-posting recaps
    const mockMessageService: any = {
      createMessage: async (wsId: string, senderId: string, dto: any) => ({
        id: `msg_recap_${Date.now()}`,
        workspace_id: wsId,
        channel_id: dto.channelId,
        sender_id: senderId,
        content: dto.content,
        created_at: new Date().toISOString(),
      }),
    };

    const recapService = new HuddleRecapService(
      huddleService,
      transcriptionService,
      undefined,
      mockMessageService,
    );

    // TEST 1: Huddle Lifecycle (Start & Join Room)
    const session = await huddleService.startHuddle(
      workspaceIdA,
      channelId,
      userId1,
      'Phase 4 WebRTC Architecture Review',
    );

    if (session.id && session.status === 'active' && session.title === 'Phase 4 WebRTC Architecture Review') {
      console.log('[PASS] Test 1a: Huddle session initialized successfully.');
    } else {
      throw new Error('[FAIL] Test 1a: Huddle start failed.');
    }

    await huddleService.joinHuddle(session.id, workspaceIdA, userId1, 'Alice (Host)', 'socket_1');
    await huddleService.joinHuddle(session.id, workspaceIdA, userId2, 'Bob (Engineer)', 'socket_2');

    const activeSession = huddleService.getHuddleById(session.id);
    if (activeSession && activeSession.participants.size === 2) {
      console.log('[PASS] Test 1b: Multiple participants joined active huddle room.');
    } else {
      throw new Error('[FAIL] Test 1b: Participant join failed.');
    }

    // TEST 2: Multi-Tenant Authorization Security Check
    let caughtTenantError = false;
    try {
      // User from Workspace B trying to join Workspace A's huddle
      await huddleService.joinHuddle(session.id, workspaceIdB, 'user_attacker', 'Attacker', 'socket_x');
    } catch (err: any) {
      if (err instanceof UnauthorizedException) {
        caughtTenantError = true;
      }
    }

    if (caughtTenantError) {
      console.log('[PASS] Test 2: Cross-tenant huddle join access attempt correctly blocked.');
    } else {
      throw new Error('[FAIL] Test 2: Multi-tenant huddle boundary security check failed.');
    }

    // TEST 3: Media State Toggles (Audio Mute, Video, Screen Share)
    huddleService.updateParticipantState(session.id, userId1, {
      isMuted: true,
      isVideoOn: false,
      isScreenSharing: true,
    });

    const p1State = activeSession?.participants.get(userId1);
    if (p1State?.isMuted && !p1State?.isVideoOn && p1State?.isScreenSharing) {
      console.log('[PASS] Test 3: Participant media state toggles (mute, camera, screen share) updated correctly.');
    } else {
      throw new Error('[FAIL] Test 3: Media state update failed.');
    }

    // TEST 4: Live Audio Transcription Streaming & Captions
    const cap1 = transcriptionService.processAudioChunk(
      session.id,
      workspaceIdA,
      channelId,
      userId1,
      'Alice',
      'We are deploying LiveKit SFU media cluster for WebRTC.',
      true,
    );

    const cap2 = transcriptionService.processAudioChunk(
      session.id,
      workspaceIdA,
      channelId,
      userId2,
      'Bob',
      'Live captions are broadcasting over WebSockets with under 150ms latency.',
      true,
    );

    if (
      cap1.speakerName === 'Alice' &&
      cap2.speakerName === 'Bob' &&
      activeSession?.transcriptLog.length === 2
    ) {
      console.log('[PASS] Test 4: Live audio transcription streaming and caption log updated successfully.');
    } else {
      throw new Error('[FAIL] Test 4: Transcription streaming failed.');
    }

    // TEST 5: WebRTC Gateway Mock Signaling
    const mockSocket: any = {
      id: 'socket_1',
      join: (room: string) => {},
      leave: (room: string) => {},
      to: (room: string) => ({
        emit: (event: string, data: any) => {},
      }),
    };

    const mockServer: any = {
      to: (room: string) => ({
        emit: (event: string, data: any) => {},
      }),
    };

    const gateway = new HuddleGateway(huddleService, transcriptionService, recapService);
    gateway.server = mockServer;

    const offerRes = gateway.handleOffer(mockSocket, {
      workspaceId: workspaceIdA,
      channelId,
      huddleId: session.id,
      senderUserId: userId1,
      sdp: { type: 'offer', sdp: 'v=0...' },
    });

    const audioChunkRes = gateway.handleAudioChunk(mockSocket, {
      huddleId: session.id,
      workspaceId: workspaceIdA,
      channelId,
      speakerUserId: userId2,
      speakerName: 'Bob',
      text: 'Testing WebRTC signaling gateway integration.',
      isFinal: true,
    });

    if (offerRes.status === 'relayed' && audioChunkRes.status === 'caption_broadcasted') {
      console.log('[PASS] Test 5: WebRTC Gateway SDP signaling and audio chunk event handlers executed cleanly.');
    } else {
      throw new Error('[FAIL] Test 5: WebRTC Gateway signaling failed.');
    }

    // TEST 6: Automated Post-Huddle AI Meeting Recap & Auto-Post
    const recapResult = await recapService.generateAndPostRecap(session.id, workspaceIdA);

    if (
      recapResult.participantCount === 2 &&
      recapResult.postedMessageId &&
      recapResult.recapMarkdown.includes('Huddle Meeting Recap') &&
      recapResult.recapMarkdown.includes('Alice') &&
      recapResult.recapMarkdown.includes('Bob')
    ) {
      console.log('[PASS] Test 6: Post-huddle automated AI recap generated and auto-posted to channel.');
    } else {
      throw new Error('[FAIL] Test 6: Huddle recap generation failed.');
    }

    // TEST 7: Room Closure & Cleanup
    const leaveRes = await huddleService.leaveHuddle(session.id, workspaceIdA, userId1);
    await huddleService.leaveHuddle(session.id, workspaceIdA, userId2);

    const closedSession = huddleService.getHuddleById(session.id);
    if (closedSession?.status === 'ended') {
      console.log('[PASS] Test 7: Huddle room closed automatically upon last participant exit.');
    } else {
      throw new Error('[FAIL] Test 7: Room closure cleanup failed.');
    }

    console.log('\n===================================================================');
    console.log('ALL PHASE 4 WEBRTC HUDDLE & TRANSCRIPTION TESTS PASSED SUCCESSFULLY');
    console.log('===================================================================');
  } catch (error) {
    console.error('\n[TEST FAILURE]:', error);
    process.exit(1);
  }
}

runWebRTCHuddleTranscriptionTests();
