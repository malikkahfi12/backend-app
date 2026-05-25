import { RoutingEdgeType } from '../enums/routing-edge-type.enum';

export const ROUTING_GRAPH_SCHEMA_VERSION = 2;

export type RoutingGraphSource = 'db' | 'redis' | 'unknown';

export interface RoutingGraphMetadata {
  graphVersion: number | null;
  schemaVersion: number;
  builtAt: string | null;
  source: RoutingGraphSource;
}

export interface RoutingGraphNode {
  stopId: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface RoutingGraphEdge {
  fromStopId: string;
  toStopId: string;
  type: RoutingEdgeType;
  distanceMeters?: number;
  walkingTimeSeconds?: number;
  routeId?: string;
  routeName?: string | null;
  tripId?: string;
  serviceId?: string;
  departureTimeSeconds?: number;
  arrivalTimeSeconds?: number;
  travelTimeSeconds?: number;
}

export interface GraphSummary {
  nodeCount: number;
  walkingEdgeCount: number;
  transferEdgeCount: number;
  transitEdgeCount: number;
  totalEdgeCount: number;
}

export interface RoutingGraph {
  nodes: Map<string, RoutingGraphNode>;
  adjacencyList: Map<string, RoutingGraphEdge[]>;
  summary: GraphSummary;
  metadata?: RoutingGraphMetadata;
}
