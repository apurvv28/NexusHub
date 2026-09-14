import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageAdapter, PresignedUrlResult } from './storage.adapter';
import { randomUUID } from 'crypto';

@Injectable()
export class S3StorageAdapter implements StorageAdapter {
  private readonly logger = new Logger(S3StorageAdapter.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;

  constructor() {
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.bucketName = process.env.AWS_S3_BUCKET_NAME || 'nexushub-attachments-dev-313696198691';

    this.s3Client = new S3Client({
      region: this.region,
    });
  }

  async generatePresignedUploadUrl(
    workspaceId: string,
    fileName: string,
    contentType: string,
    fileSize: number,
  ): Promise<PresignedUrlResult> {
    const fileExtension = fileName.includes('.') ? fileName.split('.').pop() : '';
    const fileKey = `workspaces/${workspaceId}/attachments/${randomUUID()}${fileExtension ? `.${fileExtension}` : ''}`;
    const expiresInSeconds = 900; // 15 minutes TTL

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileKey,
      ContentType: contentType,
      ContentLength: fileSize,
      Metadata: {
        workspaceId,
        originalName: fileName,
      },
    });

    try {
      const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: expiresInSeconds });
      this.logger.log(`Generated S3 presigned upload URL for key: ${fileKey} (Workspace ${workspaceId})`);
      return {
        uploadUrl,
        fileKey,
        expiresInSeconds,
      };
    } catch (err) {
      this.logger.error(`Failed to generate S3 presigned upload URL: ${(err as Error).message}`);
      throw err;
    }
  }

  getFileUrl(fileKey: string): string {
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${fileKey}`;
  }
}
