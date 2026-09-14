import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { StorageAdapter, PresignedUrlResult } from './storage.adapter';

@Injectable()
export class StorageService {
  private readonly MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB Limit

  constructor(
    @Inject('STORAGE_ADAPTER')
    private readonly storageAdapter: StorageAdapter,
  ) {}

  /**
   * Validate upload request and generate presigned URL
   */
  async getPresignedUploadUrl(
    workspaceId: string,
    fileName: string,
    contentType: string,
    fileSize: number,
  ): Promise<PresignedUrlResult> {
    if (!fileName || !contentType || !fileSize) {
      throw new BadRequestException('fileName, contentType, and fileSize parameters are required');
    }

    if (fileSize > this.MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(`File size exceeds maximum allowed threshold of 50MB`);
    }

    return this.storageAdapter.generatePresignedUploadUrl(
      workspaceId,
      fileName,
      contentType,
      fileSize,
    );
  }

  /**
   * Get public/S3 file access URL
   */
  getFileUrl(fileKey: string): { fileUrl: string } {
    if (!fileKey) {
      throw new BadRequestException('fileKey parameter is required');
    }
    return { fileUrl: this.storageAdapter.getFileUrl(fileKey) };
  }
}
