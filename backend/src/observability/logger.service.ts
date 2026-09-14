import { Injectable, LoggerService as NestLoggerService, Scope } from '@nestjs/common';
import { trace, context } from '@opentelemetry/api';

export interface StructuredLogFormat {
  timestamp: string;
  level: string;
  context?: string;
  trace_id?: string;
  span_id?: string;
  workspace_id?: string;
  message: string;
  stack?: string;
}

@Injectable({ scope: Scope.TRANSIENT })
export class StructuredLogger implements NestLoggerService {
  private contextName?: string;

  setContext(contextName: string) {
    this.contextName = contextName;
  }

  log(message: any, contextName?: string) {
    this.writeLog('INFO', message, contextName);
  }

  error(message: any, stack?: string, contextName?: string) {
    this.writeLog('ERROR', message, contextName, stack);
  }

  warn(message: any, contextName?: string) {
    this.writeLog('WARN', message, contextName);
  }

  debug(message: any, contextName?: string) {
    this.writeLog('DEBUG', message, contextName);
  }

  verbose(message: any, contextName?: string) {
    this.writeLog('VERBOSE', message, contextName);
  }

  private writeLog(level: string, message: any, contextOverride?: string, stack?: string) {
    const activeSpan = trace.getSpan(context.active());
    const spanContext = activeSpan?.spanContext();

    const logEntry: StructuredLogFormat = {
      timestamp: new Date().toISOString(),
      level,
      context: contextOverride || this.contextName || 'Application',
      trace_id: spanContext?.traceId || undefined,
      span_id: spanContext?.spanId || undefined,
      message: typeof message === 'object' ? JSON.stringify(message) : String(message),
      stack,
    };

    if (process.env.NODE_ENV === 'production' || process.env.STRUCTURED_LOGS === 'true') {
      console.log(JSON.stringify(logEntry));
    } else {
      console.log(`[${logEntry.timestamp}] [${logEntry.level}] [${logEntry.context}] ${logEntry.message}`);
    }
  }
}
