import { Injectable, Logger } from '@nestjs/common';
import { RoutingGraphCacheService } from '../routing/graph/routing-graph-cache.service';

@Injectable()
export class CacheInvalidationService {
  private readonly logger = new Logger(CacheInvalidationService.name);

  constructor(private readonly graphCacheService: RoutingGraphCacheService) {}

  async onGtfsImportComplete(): Promise<void> {
    this.logger.log('GTFS import completed, invalidating graph cache');
    await this.graphCacheService.invalidateCache();
  }
}
