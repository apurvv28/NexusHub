import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';
import { S3StorageAdapter } from './s3-storage.adapter';

@Module({
  controllers: [StorageController],
  providers: [
    StorageService,
    {
      provide: 'STORAGE_ADAPTER',
      useClass: S3StorageAdapter,
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
