import { Module } from '@nestjs/common';
import { DeveloperPlatformController } from './developer-platform.controller';
import { DeveloperPlatformService } from './developer-platform.service';

@Module({
  controllers: [DeveloperPlatformController],
  providers: [DeveloperPlatformService],
  exports: [DeveloperPlatformService],
})
export class DeveloperPlatformModule {}
