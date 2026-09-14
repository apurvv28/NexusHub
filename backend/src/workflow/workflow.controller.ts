import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  UseInterceptors,
} from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { TenantInterceptor } from '../tenant/tenant.interceptor';

@Controller('api/v1/workflows')
@UseInterceptors(TenantInterceptor)
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Post()
  async createWorkflow(
    @Headers('x-workspace-id') workspaceId: string,
    @Body('name') name: string,
    @Body('triggerType') triggerType: 'channel_join' | 'reaction_added' | 'webhook_received',
    @Body('actionType') actionType: 'send_message' | 'create_task' | 'send_email',
    @Body('config') config: any,
  ) {
    return this.workflowService.createWorkflow(workspaceId, name, triggerType, actionType, config);
  }

  @Get()
  async listWorkflows(@Headers('x-workspace-id') workspaceId: string) {
    return this.workflowService.listWorkflows(workspaceId);
  }

  @Post('trigger')
  async triggerWorkflows(
    @Headers('x-workspace-id') workspaceId: string,
    @Body('triggerType') triggerType: string,
    @Body('payload') payload: any,
  ) {
    return this.workflowService.triggerWorkflows(workspaceId, triggerType, payload);
  }
}
