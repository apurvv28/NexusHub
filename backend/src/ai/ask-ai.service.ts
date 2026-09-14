import { Injectable, Logger, Optional } from '@nestjs/common';
import { RAGRetrievalService } from './rag-retrieval.service';
import { LLMGatewayService } from './llm-gateway.service';
import { AICostGovernorService } from './ai-cost-governor.service';

export interface AskAIResponse {
  question: string;
  answer: string;
  citations: Array<{ messageId: string; snippet: string }>;
  provider: string;
}

@Injectable()
export class AskAIService {
  private readonly logger = new Logger(AskAIService.name);

  constructor(
    private readonly ragRetrieval: RAGRetrievalService,
    private readonly llmGateway: LLMGatewayService,
    @Optional() private readonly costGovernor?: AICostGovernorService,
  ) {}

  /**
   * Agentic RAG Question Answering pipeline with explicit markdown citations
   */
  async askAI(workspaceId: string, userId: string, question: string): Promise<AskAIResponse> {
    this.logger.log(`Processing /ask-ai question for user ${userId}: "${question}"`);

    // 0. Check & Consume AI Cost Governor Budget
    if (this.costGovernor) {
      await this.costGovernor.checkAndConsumeBudget(workspaceId, userId, 'ask_ai', 300, 2);
    }

    // 1. Tenant-scoped hybrid retrieval
    const retrievedContexts = await this.ragRetrieval.hybridSearch(workspaceId, question, 3);

    // 2. Format context for prompt
    let contextBlock = '';
    const citations: Array<{ messageId: string; snippet: string }> = [];

    retrievedContexts.forEach((item, idx) => {
      const citeTag = `[Source ${idx + 1}]`;
      contextBlock += `${citeTag} (Message ID: ${item.messageId}): "${item.chunkText}"\n`;
      citations.push({ messageId: item.messageId, snippet: item.chunkText });
    });

    // 3. Construct prompt
    const prompt = `System: You are an intelligent AI workspace assistant for NexusHub. Answer the user's question accurately using only the provided message context below. Include citations in your response using format [Source N](messageId).\n\nContext:\n${contextBlock || 'No relevant workspace context found.'}\n\nQuestion: ${question}`;

    // 4. Generate LLM completion
    const llmRes = await this.llmGateway.generateCompletion(prompt, { temperature: 0.2 });

    let finalAnswer = llmRes.text;

    // Append citation references if available
    if (citations.length > 0) {
      finalAnswer += '\n\n**Sources & Citations:**\n';
      citations.forEach((c, idx) => {
        finalAnswer += `- [Source ${idx + 1}](file:///messages/${c.messageId}): "${c.snippet.substring(0, 60)}..."\n`;
      });
    }

    return {
      question,
      answer: finalAnswer,
      citations,
      provider: llmRes.provider,
    };
  }
}
