import { Injectable, Logger, Optional } from '@nestjs/common';
import { LLMGatewayService } from './llm-gateway.service';
import { AICostGovernorService } from './ai-cost-governor.service';

export interface RephraseResponse {
  originalText: string;
  revisedText: string;
  style: 'formal' | 'casual' | 'concise';
  provider: string;
}

export interface GrammarFixResponse {
  originalText: string;
  correctedText: string;
  provider: string;
}

export interface TranslationResponse {
  originalText: string;
  translatedText: string;
  targetLanguage: string;
  provider: string;
}

@Injectable()
export class AIComposeAssistantService {
  private readonly logger = new Logger(AIComposeAssistantService.name);

  constructor(
    private readonly llmGateway: LLMGatewayService,
    @Optional() private readonly costGovernor?: AICostGovernorService,
  ) {}

  /**
   * Rephrases draft text into specified tone (formal, casual, concise)
   */
  async rephrase(
    workspaceId: string,
    userId: string,
    text: string,
    style: 'formal' | 'casual' | 'concise' = 'formal',
  ): Promise<RephraseResponse> {
    this.logger.log(`[Compose Assistant] User ${userId} rephrasing text to '${style}' tone.`);

    if (this.costGovernor) {
      await this.costGovernor.checkAndConsumeBudget(workspaceId, userId, 'compose', 150, 1);
    }

    const prompt = `System: Rephrase the following text to sound ${style}. Maintain the original meaning. Output only the revised text without quotes or explanation.\n\nOriginal Text: "${text}"`;

    const llmRes = await this.llmGateway.generateCompletion(prompt, { temperature: 0.3 });

    return {
      originalText: text,
      revisedText: llmRes.text.trim(),
      style,
      provider: llmRes.provider,
    };
  }

  /**
   * Corrects grammar and spelling mistakes in draft message
   */
  async fixGrammar(workspaceId: string, userId: string, text: string): Promise<GrammarFixResponse> {
    this.logger.log(`[Compose Assistant] User ${userId} fixing grammar.`);

    if (this.costGovernor) {
      await this.costGovernor.checkAndConsumeBudget(workspaceId, userId, 'compose', 150, 1);
    }

    const prompt = `System: Fix any grammar, spelling, or punctuation errors in the following text. Output only the corrected text without quotes or commentary.\n\nOriginal Text: "${text}"`;

    const llmRes = await this.llmGateway.generateCompletion(prompt, { temperature: 0.1 });

    return {
      originalText: text,
      correctedText: llmRes.text.trim(),
      provider: llmRes.provider,
    };
  }

  /**
   * Translates draft text to target language
   */
  async translate(
    workspaceId: string,
    userId: string,
    text: string,
    targetLanguage: string,
  ): Promise<TranslationResponse> {
    this.logger.log(`[Compose Assistant] User ${userId} translating text to ${targetLanguage}.`);

    if (this.costGovernor) {
      await this.costGovernor.checkAndConsumeBudget(workspaceId, userId, 'compose', 200, 1);
    }

    const prompt = `System: Translate the following text into ${targetLanguage}. Output only the translated text without quotes or preamble.\n\nOriginal Text: "${text}"`;

    const llmRes = await this.llmGateway.generateCompletion(prompt, { temperature: 0.2 });

    return {
      originalText: text,
      translatedText: llmRes.text.trim(),
      targetLanguage,
      provider: llmRes.provider,
    };
  }
}
