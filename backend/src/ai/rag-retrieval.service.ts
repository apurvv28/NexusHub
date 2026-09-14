import { Injectable, Logger } from '@nestjs/common';
import { OpenSearchService } from '../opensearch/opensearch.service';
import { VectorStoreService } from './vector-store.service';

export interface HybridSearchResult {
  messageId: string;
  chunkText: string;
  rrfScore: number;
  openSearchRank?: number;
  vectorRank?: number;
}

@Injectable()
export class RAGRetrievalService {
  private readonly logger = new Logger(RAGRetrievalService.name);
  private readonly RRF_K = 60;

  constructor(
    private readonly openSearchService: OpenSearchService,
    private readonly vectorStoreService: VectorStoreService,
  ) {}

  /**
   * Hybrid RAG Retrieval combining OpenSearch keyword search + Vector semantic similarity via Reciprocal Rank Fusion (RRF)
   */
  async hybridSearch(
    workspaceId: string,
    query: string,
    topK = 5,
  ): Promise<HybridSearchResult[]> {
    // 1. Fetch OpenSearch keyword results
    const openSearchResults = await this.openSearchService.search(workspaceId, query);

    // 2. Fetch Vector Store semantic search results
    const vectorResults = await this.vectorStoreService.similaritySearch(workspaceId, query, 10);

    const rrfScores = new Map<
      string,
      { chunkText: string; openSearchRank?: number; vectorRank?: number; score: number }
    >();

    // Rank OpenSearch results
    openSearchResults.forEach((osItem, index) => {
      const rank = index + 1;
      const existing = rrfScores.get(osItem.id) || {
        chunkText: osItem.content,
        score: 0,
      };
      existing.openSearchRank = rank;
      existing.score += 1 / (this.RRF_K + rank);
      rrfScores.set(osItem.id, existing);
    });

    // Rank Vector results
    vectorResults.forEach((vecItem, index) => {
      const rank = index + 1;
      const existing = rrfScores.get(vecItem.messageId) || {
        chunkText: vecItem.chunkText,
        score: 0,
      };
      existing.vectorRank = rank;
      existing.score += 1 / (this.RRF_K + rank);
      rrfScores.set(vecItem.messageId, existing);
    });

    const combined: HybridSearchResult[] = Array.from(rrfScores.entries()).map(([messageId, data]) => ({
      messageId,
      chunkText: data.chunkText,
      rrfScore: data.score,
      openSearchRank: data.openSearchRank,
      vectorRank: data.vectorRank,
    }));

    combined.sort((a, b) => b.rrfScore - a.rrfScore);
    this.logger.log(`Hybrid RAG RRF retrieval merged ${combined.length} results for workspace ${workspaceId}`);
    return combined.slice(0, topK);
  }
}
