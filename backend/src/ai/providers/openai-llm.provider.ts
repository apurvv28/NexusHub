import { Injectable, Logger } from '@nestjs/common';
import { LLMProvider, LLMOptions, LLMCompletionResult } from './llm-provider.interface';

@Injectable()
export class OpenAILLMProvider implements LLMProvider {
  readonly name = 'openai';
  private readonly logger = new Logger(OpenAILLMProvider.name);

  async generateCompletion(prompt: string, options?: LLMOptions): Promise<LLMCompletionResult> {
    this.logger.log(`[OpenAI Provider] Generating completion for prompt: "${prompt.substring(0, 40)}..."`);
    return {
      text: `[OpenAI Response] ${prompt}`,
      provider: 'gpt-4o',
      tokensUsed: { prompt: 140, completion: 180 },
    };
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const vec = new Array(64).fill(0).map((_, i) => Math.cos(text.length + i) * 0.5 + 0.5);
    const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0)) || 1;
    return vec.map((v) => v / norm);
  }
}
