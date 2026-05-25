import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { RoutingGraphRepository } from './repositories/routing-graph.repository';
import { RoutingGraphBuilder } from './graph/routing-graph.builder';
import { RoutingGraphSerializer } from './graph/routing-graph.serializer';
import { RoutingGraphCacheService } from './graph/routing-graph-cache.service';
import { RoutingGraphService } from './graph/routing-graph.service';
import { RoutingSearchService } from './services/routing-search.service';
import { RoutingController } from './routing.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [RoutingController],
  providers: [
    RoutingGraphRepository,
    RoutingGraphBuilder,
    RoutingGraphSerializer,
    RoutingGraphCacheService,
    RoutingGraphService,
    RoutingSearchService,
  ],
  exports: [RoutingGraphCacheService],
})
export class RoutingModule {}
