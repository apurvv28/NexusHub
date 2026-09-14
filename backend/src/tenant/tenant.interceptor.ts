import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const workspaceId = request.headers['x-workspace-id'] || request.query.workspaceId;

    if (!workspaceId) {
      throw new BadRequestException('Missing mandatory x-workspace-id tenant context header');
    }

    request.workspaceId = workspaceId;
    return next.handle();
  }
}
