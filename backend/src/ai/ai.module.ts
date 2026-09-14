import { Module } from '@nestjs/common';
import { AIController } from './ai.controller';
import { LLMGatewayService } from './llm-gateway.service';
import { VectorStoreService } from './vector-store.service';
import { RAGRetrievalService } from './rag-retrieval.service';
import { AskAIService } from './ask-ai.service';
import { ClaudeLLMProvider } from './providers/claude-llm.provider';
import { OpenAILLMProvider } from './providers/openai-llm.provider';
import { MockLiteLLMProvider } from './providers/mock-litellm.provider';
import { OpenSearchModule } from '../opensearch/opensearch.module';

@Module({
  imports: [OpenSearchModule],
  controllers: [AIController],
  providers: [
    ClaudeLLMProvider,
    OpenAILLMProvider,
    MockLiteLLMProvider,
    {
      provide: 'LLM_PROVIDERS',
      useFactory: (claude: ClaudeLLMProvider, openai: OpenAILLMProvider, litellm: MockLiteLLMProvider) => [
        claude,
        openai,
        litellm,
      ],
      inject: [ClaudeLLMProvider, OpenAILLMProvider, MockLiteLLMProvider],
    },
    LLMGatewayService,
    VectorStoreService,
    RAGRetrievalService,
    AskAIService,
  ],
  exports: [LLMGatewayService, VectorStoreService, RAGRetrievalService, AskAIService],
})
export class AIModule {}
