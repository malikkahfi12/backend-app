import { RoutingGraphBuilder } from '../graph/routing-graph.builder';
import { RoutingGraphRepository } from '../repositories/routing-graph.repository';
import { RoutingEdgeType } from '../enums/routing-edge-type.enum';

describe('RoutingGraphBuilder', () => {
  const mockRepository = {
    findGraphStops: jest.fn(),
    findNearbyStopPairs: jest.fn(),
    findTransitEdgeRows: jest.fn(),
    findOsmTransitEdgeRows: jest.fn().mockResolvedValue([]),
  } as unknown as RoutingGraphRepository;

  let builder: RoutingGraphBuilder;

  beforeEach(() => {
    builder = new RoutingGraphBuilder(mockRepository);
    jest.clearAllMocks();
  });

  describe('buildGraph', () => {
    it('builds nodes from stops', async () => {
      mockRepository.findGraphStops = jest.fn().mockResolvedValue([
        {
          id: 'stop-1',
          name: 'Stop A',
          latitude: -6.2,
          longitude: 106.8,
          parent_station_id: null,
        },
        {
          id: 'stop-2',
          name: 'Stop B',
          latitude: -6.21,
          longitude: 106.81,
          parent_station_id: null,
        },
      ]);
      mockRepository.findNearbyStopPairs = jest.fn().mockResolvedValue([]);
      mockRepository.findTransitEdgeRows = jest.fn().mockResolvedValue([]);

      const graph = await builder.buildGraph();

      expect(graph.nodes.size).toBe(2);
      expect(graph.nodes.get('stop-1')?.name).toBe('Stop A');
      expect(graph.summary.nodeCount).toBe(2);
      expect(graph.summary.totalEdgeCount).toBe(0);
    });

    it('builds bidirectional walking edges', async () => {
      mockRepository.findGraphStops = jest.fn().mockResolvedValue([
        { id: 'stop-1', name: 'A', latitude: -6.2, longitude: 106.8 },
        { id: 'stop-2', name: 'B', latitude: -6.21, longitude: 106.81 },
      ]);
      mockRepository.findNearbyStopPairs = jest.fn().mockResolvedValue([
        {
          from_stop_id: 'stop-1',
          to_stop_id: 'stop-2',
          distance_meters: 120,
        },
      ]);
      mockRepository.findTransitEdgeRows = jest.fn().mockResolvedValue([]);

      const graph = await builder.buildGraph();

      expect(graph.summary.walkingEdgeCount).toBe(2);
      const edgesA = graph.adjacencyList.get('stop-1')!;
      const edgesB = graph.adjacencyList.get('stop-2')!;
      expect(edgesA).toHaveLength(1);
      expect(edgesA[0].type).toBe(RoutingEdgeType.WALK);
      expect(edgesA[0].toStopId).toBe('stop-2');
      expect(edgesA[0].walkingTimeSeconds).toBe(100);
      expect(edgesB).toHaveLength(1);
      expect(edgesB[0].toStopId).toBe('stop-1');
    });

    it('builds transit edges from consecutive stop_times', async () => {
      mockRepository.findGraphStops = jest.fn().mockResolvedValue([
        { id: 'stop-1', name: 'A', latitude: -6.2, longitude: 106.8 },
        { id: 'stop-2', name: 'B', latitude: -6.21, longitude: 106.81 },
      ]);
      mockRepository.findNearbyStopPairs = jest.fn().mockResolvedValue([]);
      mockRepository.findTransitEdgeRows = jest.fn().mockResolvedValue([
        {
          trip_id: 'trip-1',
          from_stop_id: 'stop-1',
          to_stop_id: 'stop-2',
          stop_sequence: 1,
          departure_seconds: 28800,
          arrival_seconds: 29100,
          route_id: 'route-1',
          route_name: '1',
          service_id: 'svc-1',
        },
      ]);

      const graph = await builder.buildGraph();

      expect(graph.summary.transitEdgeCount).toBe(1);
      const edges = graph.adjacencyList.get('stop-1')!;
      expect(edges).toHaveLength(1);
      expect(edges[0].type).toBe(RoutingEdgeType.TRANSIT);
      expect(edges[0].routeName).toBe('1');
      expect(edges[0].travelTimeSeconds).toBe(300);
    });

    it('sets null routeName when route short name is unavailable', async () => {
      mockRepository.findGraphStops = jest.fn().mockResolvedValue([
        { id: 'stop-1', name: 'A', latitude: -6.2, longitude: 106.8 },
        { id: 'stop-2', name: 'B', latitude: -6.21, longitude: 106.81 },
      ]);
      mockRepository.findNearbyStopPairs = jest.fn().mockResolvedValue([]);
      mockRepository.findTransitEdgeRows = jest.fn().mockResolvedValue([
        {
          trip_id: 'trip-1',
          from_stop_id: 'stop-1',
          to_stop_id: 'stop-2',
          stop_sequence: 1,
          departure_seconds: 28800,
          arrival_seconds: 29100,
          route_id: 'route-1',
          route_name: null,
          service_id: 'svc-1',
        },
      ]);

      const graph = await builder.buildGraph();

      const edges = graph.adjacencyList.get('stop-1')!;
      expect(edges[0].routeName).toBeNull();
    });

    it('skips negative travel time', async () => {
      mockRepository.findGraphStops = jest.fn().mockResolvedValue([
        { id: 'stop-1', name: 'A', latitude: -6.2, longitude: 106.8 },
        { id: 'stop-2', name: 'B', latitude: -6.21, longitude: 106.81 },
      ]);
      mockRepository.findNearbyStopPairs = jest.fn().mockResolvedValue([]);
      mockRepository.findTransitEdgeRows = jest.fn().mockResolvedValue([
        {
          trip_id: 'trip-1',
          from_stop_id: 'stop-1',
          to_stop_id: 'stop-2',
          stop_sequence: 1,
          departure_seconds: 30000,
          arrival_seconds: 28800,
          route_id: 'route-1',
          route_name: '1',
          service_id: 'svc-1',
        },
      ]);

      const graph = await builder.buildGraph();

      expect(graph.summary.transitEdgeCount).toBe(0);
    });

    it('skips null arrival/departure seconds', async () => {
      mockRepository.findGraphStops = jest.fn().mockResolvedValue([
        { id: 'stop-1', name: 'A', latitude: -6.2, longitude: 106.8 },
        { id: 'stop-2', name: 'B', latitude: -6.21, longitude: 106.81 },
      ]);
      mockRepository.findNearbyStopPairs = jest.fn().mockResolvedValue([]);
      mockRepository.findTransitEdgeRows = jest.fn().mockResolvedValue([
        {
          trip_id: 'trip-1',
          from_stop_id: 'stop-1',
          to_stop_id: 'stop-2',
          stop_sequence: 1,
          departure_seconds: null,
          arrival_seconds: 29100,
          route_id: 'route-1',
          route_name: '1',
          service_id: 'svc-1',
        },
      ]);

      const graph = await builder.buildGraph();

      expect(graph.summary.transitEdgeCount).toBe(0);
    });

    it('calculates summary correctly', async () => {
      mockRepository.findGraphStops = jest.fn().mockResolvedValue([
        { id: 'stop-1', name: 'A', latitude: -6.2, longitude: 106.8 },
        { id: 'stop-2', name: 'B', latitude: -6.21, longitude: 106.81 },
        { id: 'stop-3', name: 'C', latitude: -6.22, longitude: 106.82 },
      ]);
      mockRepository.findNearbyStopPairs = jest.fn().mockResolvedValue([
        {
          from_stop_id: 'stop-1',
          to_stop_id: 'stop-2',
          distance_meters: 100,
        },
      ]);
      mockRepository.findTransitEdgeRows = jest.fn().mockResolvedValue([
        {
          trip_id: 'trip-1',
          from_stop_id: 'stop-1',
          to_stop_id: 'stop-2',
          stop_sequence: 1,
          departure_seconds: 100,
          arrival_seconds: 200,
          route_id: 'r-1',
          route_name: '1',
          service_id: 's-1',
        },
      ]);

      const graph = await builder.buildGraph();

      expect(graph.summary.nodeCount).toBe(3);
      expect(graph.summary.walkingEdgeCount).toBe(2);
      expect(graph.summary.transitEdgeCount).toBe(1);
      expect(graph.summary.transferEdgeCount).toBe(0);
      expect(graph.summary.totalEdgeCount).toBe(3);
    });

    it('builds TRANSFER edges for stops sharing the same parent station', async () => {
      mockRepository.findGraphStops = jest.fn().mockResolvedValue([
        {
          id: 'stop-1',
          name: 'Station A Platform 1',
          latitude: -6.2,
          longitude: 106.8,
          parent_station_id: 'station-a',
        },
        {
          id: 'stop-2',
          name: 'Station A Platform 2',
          latitude: -6.2,
          longitude: 106.8,
          parent_station_id: 'station-a',
        },
        {
          id: 'stop-3',
          name: 'Station B',
          latitude: -6.21,
          longitude: 106.81,
          parent_station_id: 'station-b',
        },
      ]);
      mockRepository.findNearbyStopPairs = jest.fn().mockResolvedValue([]);
      mockRepository.findTransitEdgeRows = jest.fn().mockResolvedValue([]);

      const graph = await builder.buildGraph();

      expect(graph.summary.transferEdgeCount).toBe(2);
      const edges1 = graph.adjacencyList.get('stop-1')!;
      const transferEdge = edges1.find(
        (e) => e.type === RoutingEdgeType.TRANSFER,
      );
      expect(transferEdge).toBeDefined();
      expect(transferEdge!.toStopId).toBe('stop-2');
      expect(transferEdge!.distanceMeters).toBe(0);
      expect(transferEdge!.walkingTimeSeconds).toBe(0);
    });

    it('does not build TRANSFER edges for stops without parent stations', async () => {
      mockRepository.findGraphStops = jest.fn().mockResolvedValue([
        {
          id: 'stop-1',
          name: 'Stop A',
          latitude: -6.2,
          longitude: 106.8,
          parent_station_id: null,
        },
        {
          id: 'stop-2',
          name: 'Stop B',
          latitude: -6.21,
          longitude: 106.81,
          parent_station_id: null,
        },
      ]);
      mockRepository.findNearbyStopPairs = jest.fn().mockResolvedValue([]);
      mockRepository.findTransitEdgeRows = jest.fn().mockResolvedValue([]);

      const graph = await builder.buildGraph();

      expect(graph.summary.transferEdgeCount).toBe(0);
    });
  });
});
