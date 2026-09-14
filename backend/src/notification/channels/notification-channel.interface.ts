export interface NotificationPayload {
  type: 'MENTION' | 'DIRECT_MESSAGE' | 'KEYWORD_MATCH' | 'SYSTEM';
  title: string;
  body: string;
  metadata?: Record<string, any>;
}

export interface NotificationChannel {
  readonly name: string;
  send(workspaceId: string, userId: string, payload: NotificationPayload): Promise<boolean>;
}
