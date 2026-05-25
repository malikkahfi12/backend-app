import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import {
  GraphSummary,
  ROUTING_GRAPH_SCHEMA_VERSION,
  RoutingGraph,
} from './routing-graph.types';
import {
  RoutingGraphSerializer,
  SerializedGraphData,
} from './routing-graph.serializer';

const GRAPH_VERSION_KEY = 'transitly:graph:version';
const GRAPH_DATA_PREFIX = 'transitly:graph:data';
const GRAPH_SUMMARY_PREFIX = 'transitly:graph:summary';
const GRAPH_CACHE_TTL_SECONDS = 86400;

@Injectable()
export class RoutingGraphCacheService {
  private readonly logger = new Logger(RoutingGraphCacheService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly serializer: RoutingGraphSerializer,
  ) {}

  async getCachedGraph(): Promise<RoutingGraph | null> {
    try {
      const version = await this.redis.get<number>(GRAPH_VERSION_KEY);
      if (!version) {
        this.logger.log('No graph version found in Redis');
        return null;
      }

      const dataKey = `${GRAPH_DATA_PREFIX}:${version}`;
      const data = await this.redis.get<SerializedGraphData>(dataKey);
      if (!data) {
        this.logger.log(
          `Graph data not found for version ${version}, falling back to DB build`,
        );
        return null;
      }

      if (data.metadata?.schemaVersion !== ROUTING_GRAPH_SCHEMA_VERSION) {
        this.logger.log(
          `Cached graph schema mismatch (cached=${data.metadata?.schemaVersion ?? 'missing'}, expected=${ROUTING_GRAPH_SCHEMA_VERSION}), falling back to DB build`,
        );
        return null;
      }

      const graph = this.serializer.deserialize(data);
      graph.metadata = {
        ...data.metadata,
        graphVersion: version,
        source: 'redis',
      };
      this.logger.log(
        `Loaded graph from Redis cache (version=${version}, nodes=${graph.nodes.size}, edges=${graph.summary.totalEdgeCount})`,
      );
      return graph;
    } catch (error) {
      this.logger.warn(
        `Failed to load graph from Redis: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
      return null;
    }
  }

  async setCachedGraph(graph: RoutingGraph): Promise<number | null> {
    try {
      const newVersion = await this.redis.incr(GRAPH_VERSION_KEY);
      if (newVersion < 0) return null;

      graph.metadata = {
        graphVersion: newVersion,
        schemaVersion:
          graph.metadata?.schemaVersion ?? ROUTING_GRAPH_SCHEMA_VERSION,
        builtAt: graph.metadata?.builtAt ?? new Date().toISOString(),
        source: graph.metadata?.source ?? 'db',
      };

      const data = this.serializer.serialize(graph);

      const dataKey = `${GRAPH_DATA_PREFIX}:${newVersion}`;
      const summaryKey = `${GRAPH_SUMMARY_PREFIX}:${newVersion}`;

      const [dataOk] = await Promise.all([
        this.redis.set(dataKey, data, GRAPH_CACHE_TTL_SECONDS),
        this.redis.set(summaryKey, graph.summary, GRAPH_CACHE_TTL_SECONDS),
      ]);

      if (dataOk) {
        this.logger.log(`Stored graph in Redis cache (version=${newVersion})`);
      }
      return newVersion;
    } catch (error) {
      this.logger.warn(
        `Failed to store graph in Redis: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
      return null;
    }
  }

  async invalidateCache(): Promise<void> {
    try {
      await this.redis.incr(GRAPH_VERSION_KEY);
      this.logger.log('Graph cache version incremented (cache invalidated)');
    } catch (error) {
      this.logger.warn(
        `Failed to invalidate graph cache: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
    }
  }

  async getCachedSummary(): Promise<GraphSummary | null> {
    try {
      const version = await this.redis.get<number>(GRAPH_VERSION_KEY);
      if (!version) return null;

      const summaryKey = `${GRAPH_SUMMARY_PREFIX}:${version}`;
      return await this.redis.get<GraphSummary>(summaryKey);
    } catch {
      return null;
    }
  }

  async getCurrentVersion(): Promise<number | null> {
    try {
      return await this.redis.get<number>(GRAPH_VERSION_KEY);
    } catch {
      return null;
    }
  }

  async isRedisAvailable(): Promise<boolean> {
    return this.redis.ping();
  }
}
