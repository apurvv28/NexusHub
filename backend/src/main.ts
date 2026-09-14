import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { initializeOpenTelemetry } from './observability/tracer';
import { SentryExceptionFilter } from './observability/sentry.filter';
import { StructuredLogger } from './observability/logger.service';

async function bootstrap() {
  // Initialize OpenTelemetry Tracing SDK before app bootstrap
  initializeOpenTelemetry();

  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Use StructuredLogger for application logs
  app.useLogger(app.get(StructuredLogger));

  // Register Global Sentry Exception Filter
  app.useGlobalFilters(new SentryExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors({
    origin: true,
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`NexusHub Backend API running on port ${port}`);
}

bootstrap();
