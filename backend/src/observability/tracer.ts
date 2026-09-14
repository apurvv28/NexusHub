import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

export const telemetrySdk = new NodeSDK({
  serviceName: 'nexushub-backend-service',
  instrumentations: [getNodeAutoInstrumentations()],
});

export function initializeOpenTelemetry(): void {
  if (process.env.NODE_ENV !== 'test') {
    telemetrySdk.start();
    console.log('[OpenTelemetry] Distributed Tracing SDK initialized for nexushub-backend-service');
  }
}
