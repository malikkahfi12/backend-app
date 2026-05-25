import { RoutingGraphService } from '../graph/routing-graph.service';
import { RoutingGraphBuilder } from '../graph/routing-graph.builder';
import { RoutingGraphCacheService } from '../graph/routing-graph-cache.service';
import { RoutingEdgeType } from '../enums/routing-edge-type.enum';
import { ROUTING_GRAPH_SCHEMA_VERSION } from '../graph/routing-graph.types';

describe('RoutingGraphService', () => {
  const mockBuilder = {
    buildGraph: jest.fn(),
  } as unknown as RoutingGraphBuilder;

  const mockCacheService = {
    isRedisAvailable: jest.fn().mockResolvedValue(false),
    getCachedGraph: jest.fn().mockResolvedValue(null),
    setCachedGraph: jest.fn().mockResolvedValue(undefined),
    invalidateCache: jest.fn().mockResolvedValue(undefined),
  } as unknown as RoutingGraphCacheService;

  let service: RoutingGraphService;

  beforeEach(() => {
    service = new RoutingGraphService(mockBuilder, mockCacheService);
    jest.clearAllMocks();
  });

  it('returns zero summary when graph not built', () => {
    const summary = service.getGraphSummary();
    expect(summary.nodeCount).toBe(0);
    expect(summary.totalEdgeCount).toBe(0);
  });

  it('returns null for stop connections when graph not built', () => {
    expect(service.getStopConnections('stop-1')).toBeNull();
  });

  it('returns null from getGraph when graph not built', () => {
    expect(service.getGraph()).toBeNull();
  });

  it('returns unknown graph metadata when graph not built', () => {
    expect(service.getGraphMetadata()).toEqual({
      graphVersion: null,
      schemaVersion: ROUTING_GRAPH_SCHEMA_VERSION,
      builtAt: null,
      source: 'unknown',
    });
  });

  it('returns summary after rebuild', async () => {
    (mockBuilder.buildGraph as jest.Mock).mockResolvedValue({
      nodes: new Map(),
      adjacencyList: new Map(),
      summary: {
        nodeCount: 5,
        walkingEdgeCount: 4,
        transferEdgeCount: 0,
        transitEdgeCount: 3,
        totalEdgeCount: 7,
      },
      metadata: {
        graphVersion: null,
        schemaVersion: ROUTING_GRAPH_SCHEMA_VERSION,
        builtAt: '2026-05-21T13:00:00.000Z',
        source: 'db',
      },
    });

    const summary = await service.rebuildGraph();
    expect(summary.nodeCount).toBe(5);
    expect(summary.walkingEdgeCount).toBe(4);
    expect(summary.totalEdgeCount).toBe(7);
    expect(service.getGraphMetadata()).toEqual({
      graphVersion: null,
      schemaVersion: ROUTING_GRAPH_SCHEMA_VERSION,
      builtAt: '2026-05-21T13:00:00.000Z',
      source: 'db',
    });
  });

  it('returns stop connections after rebuild', async () => {
    const adj = new Map();
    adj.set('stop-1', [
      {
        fromStopId: 'stop-1',
        toStopId: 'stop-2',
        type: RoutingEdgeType.WALK,
        distanceMeters: 100,
        walkingTimeSeconds: 84,
      },
    ]);

    (mockBuilder.buildGraph as jest.Mock).mockResolvedValue({
      nodes: new Map([
        [
          'stop-1',
          {
            stopId: 'stop-1',
            name: 'Stop A',
            latitude: -6.2,
            longitude: 106.8,
          },
        ],
      ]),
      adjacencyList: adj,
      summary: {
        nodeCount: 1,
        walkingEdgeCount: 1,
        transferEdgeCount: 0,
        transitEdgeCount: 0,
        totalEdgeCount: 1,
      },
    });

    await service.rebuildGraph();
    const conn = service.getStopConnections('stop-1');

    expect(conn).not.toBeNull();
    expect(conn!.stopId).toBe('stop-1');
    expect(conn!.connections).toHaveLength(1);
    expect(conn!.connections[0].type).toBe(RoutingEdgeType.WALK);
  });

  it('exposes graph via getGraph after rebuild', async () => {
    const graph = {
      nodes: new Map(),
      adjacencyList: new Map(),
      summary: {
        nodeCount: 1,
        walkingEdgeCount: 0,
        transferEdgeCount: 0,
        transitEdgeCount: 0,
        totalEdgeCount: 0,
      },
    };
    (mockBuilder.buildGraph as jest.Mock).mockResolvedValue(graph);

    await service.rebuildGraph();
    expect(service.getGraph()).toBe(graph);
  });
});
