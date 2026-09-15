import { Module } from '@nestjs/common';
import { TaskIntegrationService } from './task-integration.service';
import { TaskIntegrationController } from './task-integration.controller';
import { DatabaseModule } from '../database/database.module';
import { MessageModule } from '../message/message.module';

@Module({
  imports: [DatabaseModule, MessageModule],
  controllers: [TaskIntegrationController],
  providers: [TaskIntegrationService],
  exports: [TaskIntegrationService],
})
export class TaskIntegrationModule {}
