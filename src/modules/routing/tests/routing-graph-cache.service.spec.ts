import { RoutingGraphCacheService } from '../graph/routing-graph-cache.service';
import { RoutingGraphSerializer } from '../graph/routing-graph.serializer';
import { ROUTING_GRAPH_SCHEMA_VERSION } from '../graph/routing-graph.types';
import { RedisService } from '../../../infrastructure/redis/redis.service';

describe('RoutingGraphCacheService', () => {
  const serializer = new RoutingGraphSerializer();

  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    incr: jest.fn(),
    ping: jest.fn(),
  } as unknown as RedisService;

  let service: RoutingGraphCacheService;

  beforeEach(() => {
    service = new RoutingGraphCacheService(mockRedis, serializer);
    jest.clearAllMocks();
  });

  it('rejects cached graph data without current schema metadata', async () => {
    (mockRedis.get as jest.Mock)
      .mockResolvedValueOnce(18)
      .mockResolvedValueOnce({
        nodes: {},
        edges: {},
        summary: {
          nodeCount: 0,
          walkingEdgeCount: 0,
          transferEdgeCount: 0,
          transitEdgeCount: 0,
          totalEdgeCount: 0,
        },
      });

    await expect(service.getCachedGraph()).resolves.toBeNull();
  });

  it('loads current schema cached graph with redis metadata', async () => {
    (mockRedis.get as jest.Mock)
      .mockResolvedValueOnce(18)
      .mockResolvedValueOnce({
        nodes: {},
        edges: {},
        summary: {
          nodeCount: 0,
          walkingEdgeCount: 0,
          transferEdgeCount: 0,
          transitEdgeCount: 0,
          totalEdgeCount: 0,
        },
        metadata: {
          graphVersion: 18,
          schemaVersion: ROUTING_GRAPH_SCHEMA_VERSION,
          builtAt: '2026-05-21T13:00:00.000Z',
          source: 'db',
        },
      });

    const graph = await service.getCachedGraph();

    expect(graph?.metadata).toEqual({
      graphVersion: 18,
      schemaVersion: ROUTING_GRAPH_SCHEMA_VERSION,
      builtAt: '2026-05-21T13:00:00.000Z',
      source: 'redis',
    });
  });

  it('stores graph metadata with new redis version', async () => {
    (mockRedis.incr as jest.Mock).mockResolvedValue(19);
    (mockRedis.set as jest.Mock).mockResolvedValue(true);

    const graph = {
      nodes: new Map(),
      adjacencyList: new Map(),
      summary: {
        nodeCount: 0,
        walkingEdgeCount: 0,
        transferEdgeCount: 0,
        transitEdgeCount: 0,
        totalEdgeCount: 0,
      },
      metadata: {
        graphVersion: null,
        schemaVersion: ROUTING_GRAPH_SCHEMA_VERSION,
        builtAt: '2026-05-21T13:00:00.000Z',
        source: 'db' as const,
      },
    };

    await expect(service.setCachedGraph(graph)).resolves.toBe(19);
    expect(graph.metadata.graphVersion).toBe(19);
  });
});
