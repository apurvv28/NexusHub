import { Injectable, Logger } from '@nestjs/common';
import { LLMProvider, LLMOptions, LLMCompletionResult } from './llm-provider.interface';

@Injectable()
export class MockLiteLLMProvider implements LLMProvider {
  readonly name = 'litellm';
  private readonly logger = new Logger(MockLiteLLMProvider.name);

  async generateCompletion(prompt: string, options?: LLMOptions): Promise<LLMCompletionResult> {
    this.logger.log(`[LiteLLM Provider] Generating completion for prompt: "${prompt.substring(0, 40)}..."`);
    return {
      text: `[LiteLLM Response] ${prompt}`,
      provider: 'litellm-local-llama3',
      tokensUsed: { prompt: 100, completion: 150 },
    };
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const vec = new Array(64).fill(0).map((_, i) => Math.tan((text.length % 5) + i + 1) * 0.1);
    const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0)) || 1;
    return vec.map((v) => v / norm);
  }
}
