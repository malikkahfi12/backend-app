import { NotFoundException } from '@nestjs/common';
import { RoutingController } from '../routing.controller';
import { RoutingGraphService } from '../graph/routing-graph.service';
import { RoutingSearchService } from '../services/routing-search.service';
import { ROUTING_GRAPH_SCHEMA_VERSION } from '../graph/routing-graph.types';

describe('RoutingController', () => {
  const mockGraphService = {
    rebuildGraph: jest.fn(),
    getGraphSummary: jest.fn(),
    getStopConnections: jest.fn(),
    getGraphMetadata: jest.fn(),
  } as unknown as RoutingGraphService;

  const mockSearchService = {
    resolveStopIdFromName: jest.fn(),
    searchRoute: jest.fn(),
    searchRouteByInputs: jest.fn(),
  } as unknown as RoutingSearchService;

  let controller: RoutingController;

  beforeEach(() => {
    controller = new RoutingController(mockGraphService, mockSearchService);
    jest.clearAllMocks();
  });

  it('wraps plan route data with graph metadata only for route search', async () => {
    (mockSearchService.searchRoute as jest.Mock).mockResolvedValue({
      fromStopId: 'stop-a',
      toStopId: 'stop-b',
      options: [],
    });
    (mockGraphService.getGraphMetadata as jest.Mock).mockReturnValue({
      graphVersion: 18,
      schemaVersion: ROUTING_GRAPH_SCHEMA_VERSION,
      builtAt: '2026-05-21T13:00:00.000Z',
      source: 'redis',
    });

    const response = await controller.findRoute({
      fromStopId: 'stop-a',
      toStopId: 'stop-b',
    });

    expect(response).toEqual({
      data: {
        fromStopId: 'stop-a',
        toStopId: 'stop-b',
        options: [],
      },
      meta: {
        graphVersion: 18,
        schemaVersion: ROUTING_GRAPH_SCHEMA_VERSION,
        builtAt: '2026-05-21T13:00:00.000Z',
        source: 'redis',
      },
    });
  });

  it('uses candidate routing for name-based route search', async () => {
    (mockSearchService.searchRouteByInputs as jest.Mock).mockResolvedValue({
      fromStopId: 'origin-opposite',
      fromStopName: 'Sbr. Akses Jembatan Ciliwung Balekambang',
      toStopId: 'pgc-dalam',
      toStopName: 'PGC Dalam',
      options: [],
    });
    (mockGraphService.getGraphMetadata as jest.Mock).mockReturnValue({
      graphVersion: 18,
      schemaVersion: ROUTING_GRAPH_SCHEMA_VERSION,
      builtAt: '2026-05-21T13:00:00.000Z',
      source: 'redis',
    });

    const response = await controller.findRoute({
      fromStopName: 'Akses Jembatan Ciliwung Balekambang',
      toStopName: 'PGC 1 Cilitan',
    });

    expect(mockSearchService['searchRouteByInputs']).toHaveBeenCalledWith({
      fromStopName: 'Akses Jembatan Ciliwung Balekambang',
      toStopName: 'PGC 1 Cilitan',
    });
    expect(mockSearchService['searchRoute']).not.toHaveBeenCalled();
    expect(response.data.fromStopId).toBe('origin-opposite');
    expect(response.data.toStopId).toBe('pgc-dalam');
  });

  it('still requires origin and destination query parameters', async () => {
    await expect(controller.findRoute({})).rejects.toThrow(NotFoundException);
  });
});
