import {
  Controller,
  Post,
  Body,
  Headers,
  UseInterceptors,
} from '@nestjs/common';
import { CommandService } from './command.service';
import { TenantInterceptor } from '../tenant/tenant.interceptor';

@Controller('api/v1/commands')
@UseInterceptors(TenantInterceptor)
export class CommandController {
  constructor(private readonly commandService: CommandService) {}

  @Post('execute')
  async executeCommand(
    @Headers('x-workspace-id') workspaceId: string,
    @Headers('x-user-id') userId: string,
    @Body('channelId') channelId: string,
    @Body('command') command: string,
  ) {
    return this.commandService.executeCommand(
      workspaceId,
      userId || '00000000-0000-0000-0000-000000000000',
      channelId,
      command,
    );
  }
}
