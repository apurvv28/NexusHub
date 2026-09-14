export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface LLMCompletionResult {
  text: string;
  provider: string;
  tokensUsed?: { prompt: number; completion: number };
}

export interface LLMProvider {
  readonly name: string;
  generateCompletion(prompt: string, options?: LLMOptions): Promise<LLMCompletionResult>;
  generateEmbedding(text: string): Promise<number[]>;
}
