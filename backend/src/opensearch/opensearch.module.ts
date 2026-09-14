import { Module } from '@nestjs/common';
import { OpenSearchService } from './opensearch.service';
import { OpenSearchController } from './opensearch.controller';
import { AmazonOpenSearchAdapter } from './opensearch.adapter';

@Module({
  controllers: [OpenSearchController],
  providers: [
    OpenSearchService,
    {
      provide: 'OPENSEARCH_ADAPTER',
      useClass: AmazonOpenSearchAdapter,
    },
  ],
  exports: [OpenSearchService],
})
export class OpenSearchModule {}
