import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import * as Sentry from '@sentry/node';

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SentryExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : (exception as Error).message || 'Internal Server Error';

    // Log structured error to CloudWatch / Console
    this.logger.error(
      `[HTTP ${status}] ${request.method} ${request.url} - ${JSON.stringify(message)}`,
      (exception as Error).stack,
    );

    // Capture uncaught 5xx exceptions in Sentry
    if (status >= 500 && process.env.SENTRY_DSN) {
      Sentry.captureException(exception);
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: typeof message === 'object' && (message as any).message ? (message as any).message : message,
    });
  }
}
