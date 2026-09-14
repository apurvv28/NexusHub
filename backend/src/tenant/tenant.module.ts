import { Module } from '@nestjs/common';
import { TenantProvisioningService } from './tenant-provisioning.service';
import { TenantController } from './tenant.controller';
import { TenantInterceptor } from './tenant.interceptor';

@Module({
  controllers: [TenantController],
  providers: [TenantProvisioningService, TenantInterceptor],
  exports: [TenantProvisioningService, TenantInterceptor],
})
export class TenantModule {}
