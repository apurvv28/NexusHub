import { Injectable, Logger, Optional } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { LLMGatewayService } from './llm-gateway.service';
import { AICostGovernorService } from './ai-cost-governor.service';

export interface ChannelSummaryResponse {
  channelId: string;
  summary: string;
  messageCount: number;
  provider: string;
}

export interface ThreadSummaryResponse {
  parentMessageId: string;
  summary: string;
  replyCount: number;
  provider: string;
}

@Injectable()
export class AISummarizationService {
  private readonly logger = new Logger(AISummarizationService.name);

  constructor(
    private readonly dbService: DatabaseService,
    private readonly llmGateway: LLMGatewayService,
    @Optional() private readonly costGovernor?: AICostGovernorService,
  ) {}

  /**
   * Generates a structured markdown summary ("Catch Me Up") for recent channel messages
   */
  async summarizeChannel(
    workspaceId: string,
    userId: string,
    channelId: string,
    limit: number = 30,
  ): Promise<ChannelSummaryResponse> {
    this.logger.log(`[Summarization] User ${userId} requested summary for channel ${channelId} (limit: ${limit})`);

    // 1. Enforce AI Budget Governance
    if (this.costGovernor) {
      await this.costGovernor.checkAndConsumeBudget(workspaceId, userId, 'summarize', 400, 3);
    }

    // 2. Fetch Recent Messages
    const res = await this.dbService.query(
      `SELECT m.id, m.content, m.created_at, u.full_name
       FROM messages m
       LEFT JOIN users u ON m.sender_id = u.id
       WHERE m.workspace_id = $1 AND m.channel_id = $2
       ORDER BY m.created_at DESC
       LIMIT $3`,
      [workspaceId, channelId, limit],
    );

    if (res.rows.length === 0) {
      return {
        channelId,
        summary: '### 📌 Channel Summary\nNo recent messages available in this channel to summarize.',
        messageCount: 0,
        provider: 'none',
      };
    }

    const messages = res.rows.reverse();
    let transcript = '';
    messages.forEach((m: any) => {
      const sender = m.full_name || 'User';
      transcript += `[${sender}]: ${m.content}\n`;
    });

    // 3. Construct Prompt for LLM
    const prompt = `System: You are an intelligent workspace assistant for NexusHub. Summarize the following channel discussion transcript concisely into three structured markdown sections:\n1. ### 📌 Key Topics\n2. ### 💡 Decisions Made\n3. ### 📋 Action Items\n\nTranscript:\n${transcript}`;

    // 4. Call LLM Gateway
    const llmRes = await this.llmGateway.generateCompletion(prompt, { temperature: 0.3 });

    return {
      channelId,
      summary: llmRes.text,
      messageCount: messages.length,
      provider: llmRes.provider,
    };
  }

  /**
   * Generates a concise summary for a message thread
   */
  async summarizeThread(
    workspaceId: string,
    userId: string,
    parentMessageId: string,
  ): Promise<ThreadSummaryResponse> {
    this.logger.log(`[Summarization] User ${userId} requested summary for thread root ${parentMessageId}`);

    // 1. Enforce AI Budget Governance
    if (this.costGovernor) {
      await this.costGovernor.checkAndConsumeBudget(workspaceId, userId, 'summarize', 250, 2);
    }

    // 2. Fetch Root Message & Replies
    const rootRes = await this.dbService.query(
      `SELECT m.id, m.content, u.full_name FROM messages m LEFT JOIN users u ON m.sender_id = u.id WHERE m.id = $1 AND m.workspace_id = $2`,
      [parentMessageId, workspaceId],
    );

    const repliesRes = await this.dbService.query(
      `SELECT m.id, m.content, u.full_name FROM messages m LEFT JOIN users u ON m.sender_id = u.id WHERE m.parent_message_id = $1 AND m.workspace_id = $2 ORDER BY m.created_at ASC`,
      [parentMessageId, workspaceId],
    );

    if (rootRes.rows.length === 0) {
      return {
        parentMessageId,
        summary: 'Thread message not found.',
        replyCount: 0,
        provider: 'none',
      };
    }

    let transcript = `Root Post [${rootRes.rows[0].full_name || 'User'}]: ${rootRes.rows[0].content}\nReplies:\n`;
    repliesRes.rows.forEach((r: any) => {
      transcript += `- [${r.full_name || 'User'}]: ${r.content}\n`;
    });

    // 3. Construct Prompt
    const prompt = `System: Summarize this thread in concise markdown highlighting Key Discussion Points and Outcome:\n\n${transcript}`;

    // 4. Call LLM Gateway
    const llmRes = await this.llmGateway.generateCompletion(prompt, { temperature: 0.2 });

    return {
      parentMessageId,
      summary: llmRes.text,
      replyCount: repliesRes.rows.length,
      provider: llmRes.provider,
    };
  }
}
