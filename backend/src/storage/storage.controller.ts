import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Headers,
  UseInterceptors,
} from '@nestjs/common';
import { StorageService } from './storage.service';
import { TenantInterceptor } from '../tenant/tenant.interceptor';

@Controller('api/v1/storage')
@UseInterceptors(TenantInterceptor)
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('presigned-url')
  async getPresignedUrl(
    @Headers('x-workspace-id') workspaceId: string,
    @Body('fileName') fileName: string,
    @Body('contentType') contentType: string,
    @Body('fileSize') fileSize: number,
  ) {
    return this.storageService.getPresignedUploadUrl(
      workspaceId,
      fileName,
      contentType,
      fileSize,
    );
  }

  @Get('file-url')
  async getFileUrl(@Query('fileKey') fileKey: string) {
    return this.storageService.getFileUrl(fileKey);
  }
}
