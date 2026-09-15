import { Controller, Post, Get, Body, Headers } from '@nestjs/common';
import { TaskIntegrationService, TaskProvider } from './task-integration.service';

@Controller('tasks')
export class TaskIntegrationController {
  constructor(private readonly taskService: TaskIntegrationService) {}

  @Post('convert-message')
  async convertMessageToTask(
    @Headers('x-workspace-id') workspaceId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: {
      messageId: string;
      provider?: TaskProvider;
      title?: string;
      assigneeUserId?: string;
    },
  ) {
    const task = await this.taskService.convertMessageToTask(
      workspaceId || 'ws_default',
      body.messageId,
      userId || 'user_default',
      body.provider || 'native',
      body.title,
      body.assigneeUserId,
    );
    return { success: true, task };
  }

  @Get()
  async getTasks(@Headers('x-workspace-id') workspaceId: string) {
    const tasks = await this.taskService.getTasks(workspaceId || 'ws_default');
    return { success: true, tasks };
  }
}
