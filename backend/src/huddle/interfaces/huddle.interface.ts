export type HuddleStatus = 'active' | 'ended';

export interface HuddleParticipant {
  userId: string;
  userName: string;
  socketId: string;
  joinedAt: Date;
  isMuted: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
}

export interface HuddleSession {
  id: string;
  workspaceId: string;
  channelId: string;
  hostUserId: string;
  title?: string;
  status: HuddleStatus;
  startedAt: Date;
  endedAt?: Date;
  participants: Map<string, HuddleParticipant>; // userId -> HuddleParticipant
  transcriptLog: Array<{
    speakerUserId: string;
    speakerName: string;
    text: string;
    timestamp: Date;
  }>;
}

export interface WebRTCSignalingPayload {
  workspaceId: string;
  channelId: string;
  huddleId: string;
  senderUserId: string;
  targetUserId?: string;
  sdp?: any;
  candidate?: any;
  isMuted?: boolean;
  isVideoOn?: boolean;
  isScreenSharing?: boolean;
}

export interface CaptionEvent {
  huddleId: string;
  workspaceId: string;
  channelId: string;
  speakerUserId: string;
  speakerName: string;
  text: string;
  timestamp: Date;
  isFinal: boolean;
}

export interface HuddleRecapResult {
  huddleId: string;
  workspaceId: string;
  channelId: string;
  durationSeconds: number;
  participantCount: number;
  recapMarkdown: string;
  postedMessageId?: string;
}
