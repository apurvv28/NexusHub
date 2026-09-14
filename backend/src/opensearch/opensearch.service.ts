import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  OpenSearchAdapter,
  OpenSearchMessageDoc,
  OpenSearchResult,
} from './opensearch.adapter';

@Injectable()
export class OpenSearchService {
  private readonly logger = new Logger(OpenSearchService.name);

  constructor(
    @Inject('OPENSEARCH_ADAPTER')
    private readonly openSearchAdapter: OpenSearchAdapter,
  ) {}

  /**
   * Async indexer for message writes (AP store choice: failures do NOT throw or revert primary DB transaction)
   */
  async indexMessageAsync(doc: OpenSearchMessageDoc): Promise<void> {
    try {
      await this.openSearchAdapter.indexMessage(doc);
    } catch (err) {
      // Non-Negotiable #4: OpenSearch is an eventually consistent AP store; log failure silently without breaking core path
      this.logger.warn(
        `[AP Store Isolation] Non-blocking OpenSearch indexing failure for message ${doc.id}: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Execute high-performance OpenSearch query across tenant index
   */
  async search(
    workspaceId: string,
    query: string,
    channelId?: string,
    senderId?: string,
  ): Promise<OpenSearchResult[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    return this.openSearchAdapter.search(workspaceId, query, channelId, senderId);
  }
}
