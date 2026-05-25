import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RoutingGraphBuilder } from './routing-graph.builder';
import {
  RoutingGraph,
  GraphSummary,
  RoutingGraphEdge,
  RoutingGraphMetadata,
  ROUTING_GRAPH_SCHEMA_VERSION,
} from './routing-graph.types';
import { RoutingGraphCacheService } from './routing-graph-cache.service';
import { GraphSummaryDto } from '../dto/graph-summary.dto';
import { StopConnectionsDto } from '../dto/stop-connections.dto';
import { RoutingEdgeDto } from '../dto/routing-edge.dto';
import { DEFAULT_MAX_DEBUG_CONNECTIONS } from '../constants/routing.constants';

@Injectable()
export class RoutingGraphService implements OnModuleInit {
  private readonly logger = new Logger(RoutingGraphService.name);
  private lastBuiltGraph: RoutingGraph | null = null;
  private isRebuilding = false;

  constructor(
    private readonly builder: RoutingGraphBuilder,
    private readonly cacheService: RoutingGraphCacheService,
  ) {}

  async onModuleInit(): Promise<void> {
    const redisAvailable = await this.cacheService.isRedisAvailable();

    if (redisAvailable) {
      const cached = await this.cacheService.getCachedGraph();
      if (cached) {
        this.lastBuiltGraph = cached;
        this.logger.log(
          `Graph loaded from Redis on startup (nodes=${cached.nodes.size}, edges=${cached.summary.totalEdgeCount})`,
        );
        return;
      }
    }

    this.logger.log(
      'No cached graph found, building from database on startup...',
    );
    try {
      await this.rebuildGraph();
    } catch (error) {
      this.logger.warn(
        `Failed to auto-build graph on startup: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
    }
  }

  async rebuildGraph(): Promise<GraphSummaryDto> {
    if (this.isRebuilding) {
      this.logger.warn('Graph rebuild already in progress');
      throw new Error('Graph rebuild already in progress');
    }

    this.isRebuilding = true;
    try {
      const redisAvailable = await this.cacheService.isRedisAvailable();

      if (redisAvailable) {
        const cached = await this.cacheService.getCachedGraph();
        if (cached) {
          this.lastBuiltGraph = cached;
          this.logger.log('Graph loaded from Redis cache');
          return this.toSummaryDto(cached.summary);
        }
      }

      const newGraph = await this.builder.buildGraph();
      this.lastBuiltGraph = newGraph;

      if (redisAvailable) {
        await this.cacheService.setCachedGraph(newGraph);
      }

      return this.toSummaryDto(newGraph.summary);
    } finally {
      this.isRebuilding = false;
    }
  }

  getGraph(): RoutingGraph | null {
    return this.lastBuiltGraph;
  }

  getGraphMetadata(): RoutingGraphMetadata {
    return (
      this.lastBuiltGraph?.metadata ?? {
        graphVersion: null,
        schemaVersion: ROUTING_GRAPH_SCHEMA_VERSION,
        builtAt: null,
        source: 'unknown',
      }
    );
  }

  getGraphSummary(): GraphSummaryDto {
    if (this.lastBuiltGraph) {
      return this.toSummaryDto(this.lastBuiltGraph.summary);
    }

    return {
      nodeCount: 0,
      walkingEdgeCount: 0,
      transferEdgeCount: 0,
      transitEdgeCount: 0,
      totalEdgeCount: 0,
    };
  }

  getStopConnections(stopId: string): StopConnectionsDto | null {
    if (!this.lastBuiltGraph) {
      return null;
    }

    const node = this.lastBuiltGraph.nodes.get(stopId);
    if (!node) return null;

    const edges = this.lastBuiltGraph.adjacencyList.get(stopId) ?? [];

    const connections: RoutingEdgeDto[] = edges
      .slice(0, DEFAULT_MAX_DEBUG_CONNECTIONS)
      .map((edge) => this.toEdgeDto(edge));

    return {
      stopId: node.stopId,
      name: node.name,
      connections,
    };
  }

  private toSummaryDto(summary: GraphSummary): GraphSummaryDto {
    return {
      nodeCount: summary.nodeCount,
      walkingEdgeCount: summary.walkingEdgeCount,
      transferEdgeCount: summary.transferEdgeCount,
      transitEdgeCount: summary.transitEdgeCount,
      totalEdgeCount: summary.totalEdgeCount,
    };
  }

  private toEdgeDto(edge: RoutingGraphEdge): RoutingEdgeDto {
    return {
      toStopId: edge.toStopId,
      type: edge.type,
      distanceMeters: edge.distanceMeters,
      walkingTimeSeconds: edge.walkingTimeSeconds,
      routeId: edge.routeId,
      tripId: edge.tripId,
      departureTimeSeconds: edge.departureTimeSeconds,
      arrivalTimeSeconds: edge.arrivalTimeSeconds,
      travelTimeSeconds: edge.travelTimeSeconds,
    };
  }
}
