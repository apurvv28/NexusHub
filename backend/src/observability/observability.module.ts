import { Module, Global } from '@nestjs/common';
import { StructuredLogger } from './logger.service';
import { SentryExceptionFilter } from './sentry.filter';

@Global()
@Module({
  providers: [StructuredLogger, SentryExceptionFilter],
  exports: [StructuredLogger, SentryExceptionFilter],
})
export class ObservabilityModule {}
