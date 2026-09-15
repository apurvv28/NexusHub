import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { TenantModule } from './tenant/tenant.module';
import { ObservabilityModule } from './observability/observability.module';
import { MessageModule } from './message/message.module';
import { GatewayModule } from './gateway/gateway.module';
import { PresenceModule } from './presence/presence.module';
import { StorageModule } from './storage/storage.module';
import { UserGroupModule } from './user-group/user-group.module';
import { NotificationModule } from './notification/notification.module';
import { OpenSearchModule } from './opensearch/opensearch.module';
import { WebhookModule } from './webhook/webhook.module';
import { CommandModule } from './command/command.module';
import { WorkflowModule } from './workflow/workflow.module';
import { AIModule } from './ai/ai.module';
import { HuddleModule } from './huddle/huddle.module';
import { CalendarModule } from './calendar/calendar.module';
import { TaskIntegrationModule } from './task-integration/task-integration.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    TenantModule,
    ObservabilityModule,
    MessageModule,
    GatewayModule,
    PresenceModule,
    StorageModule,
    UserGroupModule,
    NotificationModule,
    OpenSearchModule,
    WebhookModule,
    CommandModule,
    WorkflowModule,
    AIModule,
    HuddleModule,
    CalendarModule,
    TaskIntegrationModule,
  ],
})
export class AppModule {}


