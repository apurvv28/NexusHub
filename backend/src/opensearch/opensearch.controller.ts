import {
  Controller,
  Post,
  Body,
  Headers,
  UseInterceptors,
} from '@nestjs/common';
import { OpenSearchService } from './opensearch.service';
import { TenantInterceptor } from '../tenant/tenant.interceptor';

@Controller('api/v1/search/opensearch')
@UseInterceptors(TenantInterceptor)
export class OpenSearchController {
  constructor(private readonly openSearchService: OpenSearchService) {}

  @Post()
  async search(
    @Headers('x-workspace-id') workspaceId: string,
    @Body('query') query: string,
    @Body('channelId') channelId?: string,
    @Body('senderId') senderId?: string,
  ) {
    return this.openSearchService.search(workspaceId, query, channelId, senderId);
  }
}
