import { Injectable, Logger } from '@nestjs/common';
import {
  RoutingGraph,
  RoutingGraphNode,
  RoutingGraphEdge,
  GraphSummary,
  RoutingGraphMetadata,
} from './routing-graph.types';

export interface SerializedGraphData {
  nodes: Record<string, RoutingGraphNode>;
  edges: Record<string, RoutingGraphEdge[]>;
  summary: GraphSummary;
  metadata?: RoutingGraphMetadata;
}

@Injectable()
export class RoutingGraphSerializer {
  private readonly logger = new Logger(RoutingGraphSerializer.name);

  serialize(graph: RoutingGraph): SerializedGraphData {
    const startedAt = Date.now();

    const nodes: Record<string, RoutingGraphNode> = {};
    for (const [id, node] of graph.nodes) {
      nodes[id] = node;
    }

    const edges: Record<string, RoutingGraphEdge[]> = {};
    for (const [id, edgeList] of graph.adjacencyList) {
      edges[id] = edgeList;
    }

    const data: SerializedGraphData = {
      nodes,
      edges,
      summary: graph.summary,
      metadata: graph.metadata,
    };

    this.logger.log(
      `Serialized graph (nodes=${graph.nodes.size}, edges=${graph.summary.totalEdgeCount}) in ${Date.now() - startedAt}ms`,
    );

    return data;
  }

  deserialize(data: SerializedGraphData): RoutingGraph {
    const startedAt = Date.now();

    const nodes = new Map<string, RoutingGraphNode>();
    for (const [id, node] of Object.entries(data.nodes)) {
      nodes.set(id, node);
    }

    const adjacencyList = new Map<string, RoutingGraphEdge[]>();
    for (const [id, edgeList] of Object.entries(data.edges)) {
      adjacencyList.set(id, edgeList);
    }

    this.logger.log(
      `Deserialized graph (nodes=${nodes.size}, edges=${data.summary.totalEdgeCount}) in ${Date.now() - startedAt}ms`,
    );

    return {
      nodes,
      adjacencyList,
      summary: data.summary,
      metadata: data.metadata,
    };
  }
}
