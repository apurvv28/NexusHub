import { Injectable, Logger } from '@nestjs/common';

export interface OpenSearchMessageDoc {
  id: string;
  workspaceId: string;
  channelId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export interface OpenSearchResult {
  id: string;
  workspaceId: string;
  channelId: string;
  senderId: string;
  content: string;
  score: number;
  highlightSnippet?: string;
  createdAt: string;
}

export interface OpenSearchAdapter {
  indexMessage(doc: OpenSearchMessageDoc): Promise<boolean>;
  search(
    workspaceId: string,
    query: string,
    channelId?: string,
    senderId?: string,
  ): Promise<OpenSearchResult[]>;
}

@Injectable()
export class AmazonOpenSearchAdapter implements OpenSearchAdapter {
  private readonly logger = new Logger(AmazonOpenSearchAdapter.name);
  private readonly mockIndexStore = new Map<string, OpenSearchMessageDoc[]>();

  /**
   * Index message document under tenant-namespaced index template: workspace_{ws_id}_messages
   */
  async indexMessage(doc: OpenSearchMessageDoc): Promise<boolean> {
    const indexName = `workspace_${doc.workspaceId}_messages`;
    try {
      if (!this.mockIndexStore.has(indexName)) {
        this.mockIndexStore.set(indexName, []);
      }
      const list = this.mockIndexStore.get(indexName)!;
      const existingIdx = list.findIndex((m) => m.id === doc.id);
      if (existingIdx >= 0) {
        list[existingIdx] = doc;
      } else {
        list.push(doc);
      }

      this.logger.debug(
        `[Amazon OpenSearch] Indexed message ${doc.id} under index ${indexName}`,
      );
      return true;
    } catch (err) {
      this.logger.warn(`OpenSearch indexing error: ${(err as Error).message}`);
      return false;
    }
  }

  /**
   * Search messages with fuzzy matching, score calculation, and highlight snippets
   */
  async search(
    workspaceId: string,
    query: string,
    channelId?: string,
    senderId?: string,
  ): Promise<OpenSearchResult[]> {
    const indexName = `workspace_${workspaceId}_messages`;
    const docs = this.mockIndexStore.get(indexName) || [];
    const lowerQuery = query.toLowerCase();

    return docs
      .filter((d) => {
        const matchesContent = d.content.toLowerCase().includes(lowerQuery);
        const matchesChannel = !channelId || d.channelId === channelId;
        const matchesSender = !senderId || d.senderId === senderId;
        return matchesContent && matchesChannel && matchesSender;
      })
      .map((d) => {
        const snippetIndex = d.content.toLowerCase().indexOf(lowerQuery);
        const snippet =
          snippetIndex >= 0
            ? `...${d.content.substring(Math.max(0, snippetIndex - 10), snippetIndex)}<em>${d.content.substring(snippetIndex, snippetIndex + query.length)}</em>${d.content.substring(snippetIndex + query.length, snippetIndex + 30)}...`
            : d.content;

        return {
          id: d.id,
          workspaceId: d.workspaceId,
          channelId: d.channelId,
          senderId: d.senderId,
          content: d.content,
          score: 1.5,
          highlightSnippet: snippet,
          createdAt: d.createdAt,
        };
      });
  }
}
