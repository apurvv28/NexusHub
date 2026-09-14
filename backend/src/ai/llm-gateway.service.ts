import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { LLMProvider, LLMOptions, LLMCompletionResult } from './providers/llm-provider.interface';

@Injectable()
export class LLMGatewayService {
  private readonly logger = new Logger(LLMGatewayService.name);
  private activeProviderName: string = 'claude';

  constructor(
    @Inject('LLM_PROVIDERS')
    private readonly providers: LLMProvider[],
  ) {}

  /**
   * Set active provider dynamically adhering to Liskov Substitution Principle (LSP)
   */
  setActiveProvider(providerName: string): void {
    const exists = this.providers.some((p) => p.name === providerName);
    if (!exists) {
      throw new NotFoundException(`LLM Provider '${providerName}' is not registered`);
    }
    this.activeProviderName = providerName;
    this.logger.log(`Switched active LLM provider to '${providerName}'`);
  }

  /**
   * Get active provider instance
   */
  getActiveProvider(): LLMProvider {
    const provider = this.providers.find((p) => p.name === this.activeProviderName);
    return provider || this.providers[0];
  }

  /**
   * Generate text completion using active provider
   */
  async generateCompletion(prompt: string, options?: LLMOptions): Promise<LLMCompletionResult> {
    const provider = this.getActiveProvider();
    return provider.generateCompletion(prompt, options);
  }

  /**
   * Generate text embedding vector using active provider
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const provider = this.getActiveProvider();
    return provider.generateEmbedding(text);
  }
}
