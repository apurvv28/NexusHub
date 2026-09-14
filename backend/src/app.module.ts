import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { TenantModule } from './tenant/tenant.module';
import { ObservabilityModule } from './observability/observability.module';
import { MessageModule } from './message/message.module';
import { GatewayModule } from './gateway/gateway.module';
import { PresenceModule } from './presence/presence.module';
import { StorageModule } from './storage/storage.module';

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
  ],
})
export class AppModule {}


