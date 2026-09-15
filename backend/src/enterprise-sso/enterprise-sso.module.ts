import { Module } from '@nestjs/common';
import { EnterpriseSSOService } from './enterprise-sso.service';
import { EnterpriseSSOController } from './enterprise-sso.controller';
import { SCIMController } from './scim.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [EnterpriseSSOController, SCIMController],
  providers: [EnterpriseSSOService],
  exports: [EnterpriseSSOService],
})
export class EnterpriseSSOModule {}
