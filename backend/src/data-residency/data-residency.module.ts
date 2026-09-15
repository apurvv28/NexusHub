import { Module } from '@nestjs/common';
import { DataResidencyService } from './data-residency.service';
import { DataResidencyController } from './data-residency.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [DataResidencyController],
  providers: [DataResidencyService],
  exports: [DataResidencyService],
})
export class DataResidencyModule {}
