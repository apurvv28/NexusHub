import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, UserRole } from './roles.decorator';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly db: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const workspaceId = request.headers['x-workspace-id'] || request.workspaceId;
    const userId = request.headers['x-user-id'] || (request.user && request.user.id);

    if (!workspaceId || !userId) {
      throw new ForbiddenException('Missing workspace or user context for RBAC evaluation');
    }

    // Query user membership role in workspace context
    const membership = await this.db.executeWithTenantContext(workspaceId, async (client) => {
      const res = await client.query<{ role: UserRole }>(
        `SELECT role FROM workspace_memberships WHERE workspace_id = $1 AND user_id = $2;`,
        [workspaceId, userId],
      );
      return res.rows[0];
    });

    const userRole: UserRole = membership ? membership.role : 'Member';

    // WorkspaceAdmin has all permissions
    if (userRole === 'WorkspaceAdmin') {
      return true;
    }

    const hasRole = requiredRoles.includes(userRole);
    if (!hasRole) {
      throw new ForbiddenException(
        `User role '${userRole}' is insufficient. Required roles: [${requiredRoles.join(', ')}]`,
      );
    }

    return true;
  }
}
