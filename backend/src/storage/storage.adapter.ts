export interface PresignedUrlResult {
  uploadUrl: string;
  fileKey: string;
  expiresInSeconds: number;
}

export interface StorageAdapter {
  generatePresignedUploadUrl(
    workspaceId: string,
    fileName: string,
    contentType: string,
    fileSize: number,
  ): Promise<PresignedUrlResult>;

  getFileUrl(fileKey: string): string;
}
