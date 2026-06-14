import { Injectable, Logger } from '@nestjs/common';
import { RoutingGraphRepository } from '../repositories/routing-graph.repository';
import {
  RoutingGraph,
  RoutingGraphNode,
  RoutingGraphEdge,
  GraphSummary,
  ROUTING_GRAPH_SCHEMA_VERSION,
} from './routing-graph.types';
import { RoutingEdgeType } from '../enums/routing-edge-type.enum';
import {
  walkingTimeSeconds,
  isValidTravelTime,
} from '../utils/routing-time.util';
import { DEFAULT_MAX_WALKING_DISTANCE_METERS } from '../constants/routing.constants';

@Injectable()
export class RoutingGraphBuilder {
  private readonly logger = new Logger(RoutingGraphBuilder.name);

  constructor(private readonly repository: RoutingGraphRepository) {}

  async buildGraph(): Promise<RoutingGraph> {
    this.logger.log('Building routing graph...');

    const nodes = new Map<string, RoutingGraphNode>();
    const adjacencyList = new Map<string, RoutingGraphEdge[]>();

    const stops = await this.repository.findGraphStops();
    for (const stop of stops) {
      nodes.set(stop.id, {
        stopId: stop.id,
        name: stop.name,
        latitude: stop.latitude,
        longitude: stop.longitude,
        parentStationId: stop.parent_station_id,
      });
      adjacencyList.set(stop.id, []);
    }

    this.logger.log(`Nodes: ${nodes.size}`);

    await this.buildWalkingEdges(adjacencyList);

    this.buildTransferEdges(adjacencyList, nodes);

    await this.buildTransitEdges(adjacencyList, nodes);

    const summary = this.calculateSummary(adjacencyList);

    this.logger.log(
      `Graph built: nodes=${summary.nodeCount}, walking=${summary.walkingEdgeCount}, transit=${summary.transitEdgeCount}`,
    );

    return {
      nodes,
      adjacencyList,
      summary,
      metadata: {
        graphVersion: null,
        schemaVersion: ROUTING_GRAPH_SCHEMA_VERSION,
        builtAt: new Date().toISOString(),
        source: 'db',
      },
    };
  }

  private async buildWalkingEdges(
    adjacencyList: Map<string, RoutingGraphEdge[]>,
  ): Promise<void> {
    const pairs = await this.repository.findNearbyStopPairs(
      DEFAULT_MAX_WALKING_DISTANCE_METERS,
    );

    for (const pair of pairs) {
      const walkTime = walkingTimeSeconds(pair.distance_meters);

      const edgeAB: RoutingGraphEdge = {
        fromStopId: pair.from_stop_id,
        toStopId: pair.to_stop_id,
        type: RoutingEdgeType.WALK,
        distanceMeters: pair.distance_meters,
        walkingTimeSeconds: walkTime,
      };

      const edgeBA: RoutingGraphEdge = {
        fromStopId: pair.to_stop_id,
        toStopId: pair.from_stop_id,
        type: RoutingEdgeType.WALK,
        distanceMeters: pair.distance_meters,
        walkingTimeSeconds: walkTime,
      };

      adjacencyList.get(pair.from_stop_id)?.push(edgeAB);
      adjacencyList.get(pair.to_stop_id)?.push(edgeBA);
    }

    this.logger.log(`Walking edges: ${pairs.length * 2}`);
  }

  private buildTransferEdges(
    adjacencyList: Map<string, RoutingGraphEdge[]>,
    nodes: Map<string, RoutingGraphNode>,
  ): void {
    const stationGroups = new Map<string, string[]>();

    for (const [stopId, node] of nodes) {
      if (!node.parentStationId) continue;
      const group = stationGroups.get(node.parentStationId);
      if (group) {
        group.push(stopId);
      } else {
        stationGroups.set(node.parentStationId, [stopId]);
      }
    }

    let transferEdges = 0;

    for (const [, stopIds] of stationGroups) {
      if (stopIds.length < 2) continue;

      for (let i = 0; i < stopIds.length; i++) {
        for (let j = i + 1; j < stopIds.length; j++) {
          const fromId = stopIds[i];
          const toId = stopIds[j];

          const edge: RoutingGraphEdge = {
            fromStopId: fromId,
            toStopId: toId,
            type: RoutingEdgeType.TRANSFER,
            distanceMeters: 0,
            walkingTimeSeconds: 0,
          };

          const reverseEdge: RoutingGraphEdge = {
            fromStopId: toId,
            toStopId: fromId,
            type: RoutingEdgeType.TRANSFER,
            distanceMeters: 0,
            walkingTimeSeconds: 0,
          };

          adjacencyList.get(fromId)?.push(edge);
          adjacencyList.get(toId)?.push(reverseEdge);
          transferEdges += 2;
        }
      }
    }

    this.logger.log(`Transfer edges: ${transferEdges}`);
  }

  private async buildTransitEdges(
    adjacencyList: Map<string, RoutingGraphEdge[]>,
    nodes: Map<string, RoutingGraphNode>,
  ): Promise<void> {
    let edgeCount = 0;

    const rows = await this.repository.findTransitEdgeRows();

    for (const row of rows) {
      if (
        !isValidTravelTime(row.arrival_seconds) ||
        !isValidTravelTime(row.departure_seconds)
      ) {
        continue;
      }

      const travelTime =
        (row.arrival_seconds as number) - (row.departure_seconds as number);

      if (travelTime <= 0) continue;

      const edge: RoutingGraphEdge = {
        fromStopId: row.from_stop_id,
        toStopId: row.to_stop_id,
        type: RoutingEdgeType.TRANSIT,
        tripId: row.trip_id,
        routeId: row.route_id,
        routeName: row.route_name ?? null,
        serviceId: row.service_id,
        departureTimeSeconds: row.departure_seconds as number,
        arrivalTimeSeconds: row.arrival_seconds as number,
        travelTimeSeconds: travelTime,
      };

      adjacencyList.get(row.from_stop_id)?.push(edge);
      edgeCount++;
    }

    const osmRows = await this.repository.findOsmTransitEdgeRows();
    let osmEdgeCount = 0;

    for (const row of osmRows) {
      const travelTime = this.estimateOsmTravelTime(
        nodes,
        row.from_stop_id,
        row.to_stop_id,
      );

      if (travelTime == null || travelTime <= 0) continue;

      const edge: RoutingGraphEdge = {
        fromStopId: row.from_stop_id,
        toStopId: row.to_stop_id,
        type: RoutingEdgeType.TRANSIT,
        tripId: row.trip_id,
        routeId: row.route_id,
        routeName: row.route_name ?? null,
        serviceId: row.service_id,
        travelTimeSeconds: travelTime,
      };

      adjacencyList.get(row.from_stop_id)?.push(edge);
      osmEdgeCount++;
    }

    this.logger.log(
      `Transit edges: ${edgeCount} (GTFS) + ${osmEdgeCount} (OSM)`,
    );
  }

  private estimateOsmTravelTime(
    nodes: Map<string, RoutingGraphNode>,
    fromStopId: string,
    toStopId: string,
  ): number | null {
    const from = nodes.get(fromStopId);
    const to = nodes.get(toStopId);

    if (!from || !to) return null;

    const distanceMeters = haversineMeters(
      from.latitude,
      from.longitude,
      to.latitude,
      to.longitude,
    );

    const AVG_BUS_SPEED_MPS = 8.33;
    return Math.ceil(distanceMeters / AVG_BUS_SPEED_MPS);
  }

  private calculateSummary(
    adjacencyList: Map<string, RoutingGraphEdge[]>,
  ): GraphSummary {
    let walking = 0;
    let transit = 0;
    let transfer = 0;

    for (const edges of adjacencyList.values()) {
      for (const edge of edges) {
        switch (edge.type) {
          case RoutingEdgeType.WALK:
            walking++;
            break;
          case RoutingEdgeType.TRANSIT:
            transit++;
            break;
          case RoutingEdgeType.TRANSFER:
            transfer++;
            break;
        }
      }
    }

    return {
      nodeCount: adjacencyList.size,
      walkingEdgeCount: walking,
      transferEdgeCount: transfer,
      transitEdgeCount: transit,
      totalEdgeCount: walking + transit + transfer,
    };
  }
}

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
