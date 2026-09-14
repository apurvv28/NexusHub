import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { TenantModule } from './tenant/tenant.module';
import { ObservabilityModule } from './observability/observability.module';

@Module({
  imports: [DatabaseModule, AuthModule, TenantModule, ObservabilityModule],
})
export class AppModule {}

