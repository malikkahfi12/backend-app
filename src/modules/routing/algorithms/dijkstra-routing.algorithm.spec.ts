import {
  findEarliestArrivalPath,
  findTimelessBestPath,
  findTimelessBestPaths,
} from './dijkstra-routing.algorithm';
import { RoutingGraph, RoutingGraphEdge } from '../graph/routing-graph.types';
import { RoutingEdgeType } from '../enums/routing-edge-type.enum';

function makeGraph(
  nodes: Array<{ id: string; name: string; lat: number; lng: number }>,
  edges: RoutingGraphEdge[],
): RoutingGraph {
  const nodeMap = new Map<string, unknown>();
  const adj = new Map<string, RoutingGraphEdge[]>();

  for (const n of nodes) {
    nodeMap.set(n.id, {
      stopId: n.id,
      name: n.name,
      latitude: n.lat,
      longitude: n.lng,
    });
    adj.set(n.id, []);
  }

  for (const e of edges) {
    adj.get(e.fromStopId)?.push(e);
  }

  return {
    nodes: nodeMap as unknown as Map<
      string,
      import('../graph/routing-graph.types').RoutingGraphNode
    >,
    adjacencyList: adj,
    summary: {
      nodeCount: nodes.length,
      walkingEdgeCount: 0,
      transferEdgeCount: 0,
      transitEdgeCount: 0,
      totalEdgeCount: 0,
    },
  };
}

describe('findEarliestArrivalPath', () => {
  const graph = makeGraph(
    [
      { id: 'stop-a', name: 'A', lat: -6.2, lng: 106.8 },
      { id: 'stop-b', name: 'B', lat: -6.21, lng: 106.81 },
      { id: 'stop-c', name: 'C', lat: -6.22, lng: 106.82 },
    ],
    [
      {
        fromStopId: 'stop-a',
        toStopId: 'stop-b',
        type: RoutingEdgeType.WALK,
        distanceMeters: 120,
        walkingTimeSeconds: 100,
      },
      {
        fromStopId: 'stop-b',
        toStopId: 'stop-a',
        type: RoutingEdgeType.WALK,
        distanceMeters: 120,
        walkingTimeSeconds: 100,
      },
      {
        fromStopId: 'stop-b',
        toStopId: 'stop-c',
        type: RoutingEdgeType.TRANSIT,
        tripId: 'trip-1',
        routeId: 'route-1',
        serviceId: 'svc-1',
        departureTimeSeconds: 29000,
        arrivalTimeSeconds: 29300,
        travelTimeSeconds: 300,
      },
    ],
  );

  it('returns 0 duration for same stop', () => {
    const result = findEarliestArrivalPath(graph, 'stop-a', 'stop-a', 28800);
    expect(result.path).not.toBeNull();
    expect(result.path!.totalDurationSeconds).toBe(0);
    expect(result.path!.legs).toHaveLength(0);
  });

  it('finds simple walk path', () => {
    const result = findEarliestArrivalPath(graph, 'stop-a', 'stop-b', 28800);
    expect(result.path).not.toBeNull();
    expect(result.path!.totalDurationSeconds).toBe(100);
    expect(result.path!.walkingDurationSeconds).toBe(100);
    expect(result.path!.waitingDurationSeconds).toBe(0);
    expect(result.path!.transferCount).toBe(0);
    expect(result.path!.legs).toHaveLength(1);
    expect(result.path!.legs[0].type).toBe(RoutingEdgeType.WALK);
  });

  it('finds transit path', () => {
    const result = findEarliestArrivalPath(graph, 'stop-b', 'stop-c', 28000);
    expect(result.path).not.toBeNull();
    expect(result.path!.legs).toHaveLength(1);
    expect(result.path!.legs[0].type).toBe(RoutingEdgeType.TRANSIT);
    expect(result.path!.waitingDurationSeconds).toBe(1000); // 29000 - 28000
  });

  it('returns null for no path', () => {
    const result = findEarliestArrivalPath(graph, 'stop-c', 'stop-a', 28800);
    expect(result.path).toBeNull();
  });

  it('skips transit that has already departed', () => {
    const result = findEarliestArrivalPath(graph, 'stop-b', 'stop-c', 30000);
    expect(result.path).toBeNull();
  });

  it('finds walk + transit combo', () => {
    const result = findEarliestArrivalPath(graph, 'stop-a', 'stop-c', 28800);
    expect(result.path).not.toBeNull();
    expect(result.path!.legs.length).toBeGreaterThanOrEqual(2);
    const walkLeg = result.path!.legs.find(
      (l) => l.type === RoutingEdgeType.WALK,
    );
    const transitLeg = result.path!.legs.find(
      (l) => l.type === RoutingEdgeType.TRANSIT,
    );
    expect(walkLeg).toBeDefined();
    expect(transitLeg).toBeDefined();
  });

  it('returns null for unknown stops', () => {
    const result = findEarliestArrivalPath(
      graph,
      'stop-unknown',
      'stop-b',
      28800,
    );
    expect(result.path).toBeNull();
  });

  it('finds a timeless transit path even when scheduled departure has passed', () => {
    const result = findTimelessBestPath(graph, 'stop-b', 'stop-c');
    expect(result.path).not.toBeNull();
    expect(result.path!.totalDurationSeconds).toBe(300);
    expect(result.path!.waitingDurationSeconds).toBe(0);
    expect(result.path!.legs).toHaveLength(1);
    expect(result.path!.legs[0].type).toBe(RoutingEdgeType.TRANSIT);
    expect(result.path!.legs[0].departureTimeSeconds).toBeUndefined();
    expect(result.path!.legs[0].arrivalTimeSeconds).toBeUndefined();
  });

  it('prefers shortest timeless duration before fewer transfers', () => {
    const transferGraph = makeGraph(
      [
        { id: 'a', name: 'A', lat: -6.2, lng: 106.8 },
        { id: 'b', name: 'B', lat: -6.21, lng: 106.81 },
        { id: 'c', name: 'C', lat: -6.22, lng: 106.82 },
      ],
      [
        {
          fromStopId: 'a',
          toStopId: 'c',
          type: RoutingEdgeType.TRANSIT,
          tripId: 'slow-direct',
          routeId: 'route-direct',
          travelTimeSeconds: 900,
        },
        {
          fromStopId: 'a',
          toStopId: 'b',
          type: RoutingEdgeType.TRANSIT,
          tripId: 'fast-1',
          routeId: 'route-1',
          travelTimeSeconds: 200,
        },
        {
          fromStopId: 'b',
          toStopId: 'c',
          type: RoutingEdgeType.TRANSIT,
          tripId: 'fast-2',
          routeId: 'route-2',
          travelTimeSeconds: 200,
        },
      ],
    );

    const result = findTimelessBestPath(transferGraph, 'a', 'c');
    expect(result.path).not.toBeNull();
    expect(result.path!.totalDurationSeconds).toBe(400);
    expect(result.path!.transferCount).toBe(1);
  });

  it('uses lower walking as a timeless tie-breaker when total cost ties', () => {
    const tieGraph = makeGraph(
      [
        { id: 'a', name: 'A', lat: -6.2, lng: 106.8 },
        { id: 'b', name: 'B', lat: -6.21, lng: 106.81 },
        { id: 'c', name: 'C', lat: -6.22, lng: 106.82 },
        { id: 'd', name: 'D', lat: -6.23, lng: 106.83 },
      ],
      [
        {
          fromStopId: 'a',
          toStopId: 'b',
          type: RoutingEdgeType.WALK,
          distanceMeters: 240,
          walkingTimeSeconds: 200,
        },
        {
          fromStopId: 'b',
          toStopId: 'd',
          type: RoutingEdgeType.TRANSIT,
          tripId: 'trip-walk-more',
          routeId: 'route-1',
          travelTimeSeconds: 300,
        },
        {
          fromStopId: 'a',
          toStopId: 'c',
          type: RoutingEdgeType.WALK,
          distanceMeters: 120,
          walkingTimeSeconds: 100,
        },
        {
          fromStopId: 'c',
          toStopId: 'd',
          type: RoutingEdgeType.TRANSIT,
          tripId: 'trip-walk-less',
          routeId: 'route-2',
          travelTimeSeconds: 400,
        },
      ],
    );

    const result = findTimelessBestPath(tieGraph, 'a', 'd');
    expect(result.path).not.toBeNull();
    expect(result.path!.totalDurationSeconds).toBe(500);
    expect(result.path!.walkingDurationSeconds).toBe(100);
    expect(result.path!.legs[1].routeId).toBe('route-2');
    expect(result.path!.legs[1].tripId).toBe('trip-walk-less');
  });

  it('prefers same-route transit over walking between the same stops', () => {
    const graph = makeGraph(
      [
        { id: 'a', name: 'A', lat: -6.2, lng: 106.8 },
        { id: 'b', name: 'B', lat: -6.21, lng: 106.81 },
        { id: 'c', name: 'C', lat: -6.22, lng: 106.82 },
      ],
      [
        {
          fromStopId: 'a',
          toStopId: 'b',
          type: RoutingEdgeType.TRANSIT,
          tripId: 'trip-1',
          routeId: 'route-1',
          travelTimeSeconds: 100,
        },
        {
          fromStopId: 'b',
          toStopId: 'c',
          type: RoutingEdgeType.WALK,
          distanceMeters: 120,
          walkingTimeSeconds: 100,
        },
        {
          fromStopId: 'b',
          toStopId: 'c',
          type: RoutingEdgeType.TRANSIT,
          tripId: 'trip-2',
          routeId: 'route-1',
          travelTimeSeconds: 120,
        },
      ],
    );

    const result = findTimelessBestPath(graph, 'a', 'c');

    expect(result.path).not.toBeNull();
    expect(result.path!.legs).toHaveLength(2);
    expect(result.path!.legs[0].type).toBe(RoutingEdgeType.TRANSIT);
    expect(result.path!.legs[0].routeId).toBe('route-1');
    expect(result.path!.legs[0].tripId).toBe('trip-1');
    expect(result.path!.legs[1].type).toBe(RoutingEdgeType.TRANSIT);
    expect(result.path!.legs[1].routeId).toBe('route-1');
    expect(result.path!.legs[1].tripId).toBe('trip-2');
    expect(result.path!.walkingDurationSeconds).toBe(0);
  });

  it('collapses same-route transit walk gap into one transit leg', () => {
    const graph = makeGraph(
      [
        { id: 'a', name: 'A', lat: -6.2, lng: 106.8 },
        { id: 'b', name: 'B', lat: -6.21, lng: 106.81 },
        { id: 'c', name: 'C', lat: -6.22, lng: 106.82 },
        { id: 'd', name: 'D', lat: -6.23, lng: 106.83 },
      ],
      [
        {
          fromStopId: 'a',
          toStopId: 'b',
          type: RoutingEdgeType.TRANSIT,
          tripId: 'trip-1',
          routeId: 'route-1',
          travelTimeSeconds: 100,
        },
        {
          fromStopId: 'b',
          toStopId: 'c',
          type: RoutingEdgeType.WALK,
          distanceMeters: 120,
          walkingTimeSeconds: 100,
        },
        {
          fromStopId: 'c',
          toStopId: 'd',
          type: RoutingEdgeType.TRANSIT,
          tripId: 'trip-2',
          routeId: 'route-1',
          travelTimeSeconds: 100,
        },
      ],
    );

    const result = findTimelessBestPath(graph, 'a', 'd');

    expect(result.path).not.toBeNull();
    expect(result.path!.legs).toHaveLength(1);
    expect(result.path!.legs[0].type).toBe(RoutingEdgeType.TRANSIT);
    expect(result.path!.legs[0].fromStopId).toBe('a');
    expect(result.path!.legs[0].toStopId).toBe('d');
    expect(result.path!.legs[0].routeId).toBe('route-1');
    expect(result.path!.legs[0].durationSeconds).toBe(300);
    expect(result.path!.walkingDurationSeconds).toBe(0);
  });

  it('allows walking as a connector between different routes', () => {
    const graph = makeGraph(
      [
        { id: 'a', name: 'A', lat: -6.2, lng: 106.8 },
        { id: 'b', name: 'B', lat: -6.21, lng: 106.81 },
        { id: 'c', name: 'C', lat: -6.22, lng: 106.82 },
        { id: 'd', name: 'D', lat: -6.23, lng: 106.83 },
      ],
      [
        {
          fromStopId: 'a',
          toStopId: 'b',
          type: RoutingEdgeType.TRANSIT,
          tripId: 'trip-1',
          routeId: 'route-1',
          travelTimeSeconds: 100,
        },
        {
          fromStopId: 'b',
          toStopId: 'c',
          type: RoutingEdgeType.WALK,
          distanceMeters: 120,
          walkingTimeSeconds: 100,
        },
        {
          fromStopId: 'c',
          toStopId: 'd',
          type: RoutingEdgeType.TRANSIT,
          tripId: 'trip-2',
          routeId: 'route-2',
          travelTimeSeconds: 100,
        },
      ],
    );

    const result = findTimelessBestPath(graph, 'a', 'd');

    expect(result.path).not.toBeNull();
    expect(
      result.path!.legs.some((leg) => leg.type === RoutingEdgeType.WALK),
    ).toBe(true);
  });

  it('returns deduplicated timeless route options up to max options', () => {
    const alternativeGraph = makeGraph(
      [
        { id: 'a', name: 'A', lat: -6.2, lng: 106.8 },
        { id: 'b', name: 'B', lat: -6.21, lng: 106.81 },
        { id: 'c', name: 'C', lat: -6.22, lng: 106.82 },
      ],
      [
        {
          fromStopId: 'a',
          toStopId: 'b',
          type: RoutingEdgeType.TRANSIT,
          tripId: 'fast-1',
          routeId: 'route-1',
          travelTimeSeconds: 100,
        },
        {
          fromStopId: 'b',
          toStopId: 'c',
          type: RoutingEdgeType.TRANSIT,
          tripId: 'fast-2',
          routeId: 'route-2',
          travelTimeSeconds: 100,
        },
        {
          fromStopId: 'a',
          toStopId: 'c',
          type: RoutingEdgeType.TRANSIT,
          tripId: 'direct',
          routeId: 'route-direct',
          travelTimeSeconds: 800,
        },
      ],
    );

    const results = findTimelessBestPaths(alternativeGraph, 'a', 'c', 3);
    const paths = results.map((result) => result.path).filter(Boolean);

    expect(paths).toHaveLength(2);
    expect(paths[0]!.strategy).toBe('FASTEST');
    expect(paths[0]!.totalDurationSeconds).toBe(800);
    expect(paths[1]!.strategy).toBe('FASTEST');
    expect(paths[1]!.totalDurationSeconds).toBe(200);
  });

  it('keeps separate consecutive timeless transit legs when trips differ on same route', () => {
    const sameRouteGraph = makeGraph(
      [
        { id: 'a', name: 'A', lat: -6.2, lng: 106.8 },
        { id: 'b', name: 'B', lat: -6.21, lng: 106.81 },
        { id: 'c', name: 'C', lat: -6.22, lng: 106.82 },
      ],
      [
        {
          fromStopId: 'a',
          toStopId: 'b',
          type: RoutingEdgeType.TRANSIT,
          tripId: 'trip-1',
          routeId: 'route-1',
          routeName: '1',
          travelTimeSeconds: 100,
        },
        {
          fromStopId: 'b',
          toStopId: 'c',
          type: RoutingEdgeType.TRANSIT,
          tripId: 'trip-2',
          routeId: 'route-1',
          routeName: '1',
          travelTimeSeconds: 120,
        },
      ],
    );

    const result = findTimelessBestPath(sameRouteGraph, 'a', 'c');
    expect(result.path).not.toBeNull();
    expect(result.path!.legs).toHaveLength(2);
    expect(result.path!.legs[0].routeId).toBe('route-1');
    expect(result.path!.legs[0].routeName).toBe('1');
    expect(result.path!.legs[0].tripId).toBe('trip-1');
    expect(result.path!.legs[0].durationSeconds).toBe(100);
    expect(result.path!.legs[1].tripId).toBe('trip-2');
    expect(result.path!.legs[1].durationSeconds).toBe(120);
    expect(result.path!.transferCount).toBe(0);
  });

  it('direct route scan finds same-route path with zero transfers when available', () => {
    const routeChangeGraph = makeGraph(
      [
        { id: 'a', name: 'A', lat: -6.2, lng: 106.8 },
        { id: 'b', name: 'B', lat: -6.21, lng: 106.81 },
        { id: 'c', name: 'C', lat: -6.22, lng: 106.82 },
        { id: 'd', name: 'D', lat: -6.23, lng: 106.83 },
      ],
      [
        {
          fromStopId: 'a',
          toStopId: 'b',
          type: RoutingEdgeType.TRANSIT,
          tripId: 'fast-1',
          routeId: 'route-1',
          travelTimeSeconds: 100,
        },
        {
          fromStopId: 'b',
          toStopId: 'd',
          type: RoutingEdgeType.TRANSIT,
          tripId: 'fast-2',
          routeId: 'route-2',
          travelTimeSeconds: 100,
        },
        {
          fromStopId: 'a',
          toStopId: 'c',
          type: RoutingEdgeType.TRANSIT,
          tripId: 'simple-1',
          routeId: 'route-direct',
          travelTimeSeconds: 700,
        },
        {
          fromStopId: 'c',
          toStopId: 'd',
          type: RoutingEdgeType.TRANSIT,
          tripId: 'simple-2',
          routeId: 'route-direct',
          travelTimeSeconds: 700,
        },
      ],
    );

    const results = findTimelessBestPaths(routeChangeGraph, 'a', 'd', 3);
    const direct = results.find(
      (result) =>
        result.path &&
        result.path.transferCount === 0 &&
        result.path.legs.length > 0,
    );

    expect(direct?.path).toBeDefined();
    expect(direct!.path!.totalDurationSeconds).toBe(1400);
    expect(direct!.path!.transferCount).toBe(0);
    expect(direct!.path!.legs.length).toBeGreaterThanOrEqual(1);
    for (const leg of direct!.path!.legs) {
      expect(leg.routeId).toBe('route-direct');
    }
  });
});
