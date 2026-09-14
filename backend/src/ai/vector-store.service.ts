import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { LLMGatewayService } from './llm-gateway.service';

export interface VectorSearchResult {
  messageId: string;
  chunkText: string;
  similarityScore: number;
}

@Injectable()
export class VectorStoreService {
  private readonly logger = new Logger(VectorStoreService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly llmGateway: LLMGatewayService,
  ) {}

  /**
   * Compute cosine similarity between two vector arrays
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length || vecA.length === 0) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Generate vector embedding and index message chunk in tenant vector store
   */
  async indexMessage(workspaceId: string, messageId: string, chunkText: string): Promise<string> {
    const embedding = await this.llmGateway.generateEmbedding(chunkText);

    return this.db.executeWithTenantContext(workspaceId, async (client) => {
      const res = await client.query<{ id: string }>(
        `INSERT INTO vector_embeddings (id, workspace_id, message_id, chunk_text, embedding)
         VALUES (gen_random_uuid(), $1, $2, $3, $4)
         RETURNING id;`,
        [workspaceId, messageId, chunkText, JSON.stringify(embedding)],
      );

      this.logger.debug(`Indexed vector embedding for message ${messageId} in workspace ${workspaceId}`);
      return res.rows[0].id;
    });
  }

  /**
   * Perform tenant-scoped semantic similarity search
   */
  async similaritySearch(
    workspaceId: string,
    query: string,
    topK = 5,
  ): Promise<VectorSearchResult[]> {
    const queryEmbedding = await this.llmGateway.generateEmbedding(query);

    return this.db.executeWithTenantContext(workspaceId, async (client) => {
      const res = await client.query<{
        message_id: string;
        chunk_text: string;
        embedding: any;
      }>(
        `SELECT message_id, chunk_text, embedding FROM vector_embeddings WHERE workspace_id = $1;`,
        [workspaceId],
      );

      const scored = res.rows.map((row) => {
        const vec = typeof row.embedding === 'string' ? JSON.parse(row.embedding) : row.embedding;
        const score = this.cosineSimilarity(queryEmbedding, vec);
        return {
          messageId: row.message_id,
          chunkText: row.chunk_text,
          similarityScore: score,
        };
      });

      scored.sort((a, b) => b.similarityScore - a.similarityScore);
      return scored.slice(0, topK);
    });
  }
}
