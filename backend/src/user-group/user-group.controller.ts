import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Headers,
  UseInterceptors,
} from '@nestjs/common';
import { UserGroupService } from './user-group.service';
import { TenantInterceptor } from '../tenant/tenant.interceptor';

@Controller('api/v1/user-groups')
@UseInterceptors(TenantInterceptor)
export class UserGroupController {
  constructor(private readonly userGroupService: UserGroupService) {}

  @Post()
  async createGroup(
    @Headers('x-workspace-id') workspaceId: string,
    @Body('name') name: string,
    @Body('handle') handle: string,
    @Body('description') description?: string,
  ) {
    return this.userGroupService.createGroup(workspaceId, name, handle, description);
  }

  @Get()
  async listGroups(@Headers('x-workspace-id') workspaceId: string) {
    return this.userGroupService.listGroups(workspaceId);
  }

  @Post(':groupId/members')
  async addMember(
    @Headers('x-workspace-id') workspaceId: string,
    @Param('groupId') groupId: string,
    @Body('userId') userId: string,
  ) {
    return this.userGroupService.addMember(workspaceId, groupId, userId);
  }

  @Delete(':groupId/members/:userId')
  async removeMember(
    @Headers('x-workspace-id') workspaceId: string,
    @Param('groupId') groupId: string,
    @Param('userId') userId: string,
  ) {
    return this.userGroupService.removeMember(workspaceId, groupId, userId);
  }

  @Get('resolve/:handle')
  async resolveGroupMentions(
    @Headers('x-workspace-id') workspaceId: string,
    @Param('handle') handle: string,
  ) {
    return this.userGroupService.resolveGroupMentions(workspaceId, handle);
  }
}
