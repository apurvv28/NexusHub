import { Injectable, Logger } from '@nestjs/common';
import { LLMProvider, LLMOptions, LLMCompletionResult } from './llm-provider.interface';

@Injectable()
export class ClaudeLLMProvider implements LLMProvider {
  readonly name = 'claude';
  private readonly logger = new Logger(ClaudeLLMProvider.name);

  async generateCompletion(prompt: string, options?: LLMOptions): Promise<LLMCompletionResult> {
    this.logger.log(`[Claude Provider] Generating completion for prompt: "${prompt.substring(0, 40)}..."`);
    return {
      text: `[Claude Response] ${prompt}`,
      provider: 'claude-3-5-sonnet',
      tokensUsed: { prompt: 150, completion: 200 },
    };
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // Generate deterministic 64-dim normalized embedding array for dev/testing
    const vec = new Array(64).fill(0).map((_, i) => Math.sin(text.length + i) * 0.5 + 0.5);
    const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0)) || 1;
    return vec.map((v) => v / norm);
  }
}
