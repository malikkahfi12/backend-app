import { RoutingGraph, RoutingGraphEdge } from '../graph/routing-graph.types';
import { RoutingEdgeType } from '../enums/routing-edge-type.enum';
import { MinHeap } from '../../../common/utils/min-heap';

export interface DijkstraState {
  stopId: string;
  arrivalTime: number;
  previousStopId: string | null;
  previousEdge: RoutingGraphEdge | null;
  totalWalking: number;
  totalWaiting: number;
}

export interface TimelessDijkstraState {
  stopId: string;
  cost: number;
  totalDuration: number;
  previousStopId: string | null;
  previousEdge: RoutingGraphEdge | null;
  totalWalking: number;
  transferCount: number;
  legCount: number;
  previousTransitRouteId: string | null;
}

export type TimelessRouteStrategy =
  | 'FASTEST'
  | 'LESS_WALKING'
  | 'FEWER_TRANSITS';

export interface TimelessRoutingProfile {
  strategy: TimelessRouteStrategy;
  walkingPenaltyMultiplier: number;
  routeChangePenaltySeconds: number;
  sameRouteWalkPenaltySeconds: number;
  transferWalkingPenaltySeconds: number;
}

export interface RouteLeg {
  type: RoutingEdgeType;
  fromStopId: string;
  toStopId: string;
  durationSeconds: number;
  distanceMeters?: number;
  routeId?: string | null;
  routeName?: string | null;
  tripId?: string | null;
  departureTimeSeconds?: number;
  arrivalTimeSeconds?: number;
}

export interface PathResult {
  strategy?: TimelessRouteStrategy;
  totalDurationSeconds: number;
  walkingDurationSeconds: number;
  waitingDurationSeconds: number;
  transferCount: number;
  legs: RouteLeg[];
}

export interface RouteDebugInfo {
  fromStopFound: boolean;
  toStopFound: boolean;
  nearbyTransitEdges: number;
  activeTripsChecked: number;
  validTransitEdges: number;
  reason?: string;
}

export interface SearchResult {
  path: PathResult | null;
  debug: RouteDebugInfo;
}

export function findEarliestArrivalPath(
  graph: RoutingGraph,
  fromStopId: string,
  toStopId: string,
  departureTimeSeconds: number,
): SearchResult {
  const fromStopExists = graph.nodes.has(fromStopId);
  const toStopExists = graph.nodes.has(toStopId);

  const fromEdges = fromStopExists
    ? (graph.adjacencyList.get(fromStopId) ?? [])
    : [];
  const nearbyTransitEdges = fromEdges.filter(
    (e) => e.type === RoutingEdgeType.TRANSIT,
  ).length;

  if (fromStopId === toStopId) {
    return {
      path: {
        totalDurationSeconds: 0,
        walkingDurationSeconds: 0,
        waitingDurationSeconds: 0,
        transferCount: 0,
        legs: [],
      },
      debug: {
        fromStopFound: fromStopExists,
        toStopFound: toStopExists,
        nearbyTransitEdges,
        activeTripsChecked: 0,
        validTransitEdges: 0,
        reason: 'Origin and destination are the same',
      },
    };
  }

  if (!fromStopExists || !toStopExists) {
    return {
      path: null,
      debug: {
        fromStopFound: fromStopExists,
        toStopFound: toStopExists,
        nearbyTransitEdges,
        activeTripsChecked: 0,
        validTransitEdges: 0,
        reason: !fromStopExists
          ? 'Origin stop not found in graph'
          : 'Destination stop not found in graph',
      },
    };
  }

  const visited = new Map<string, number>();
  const previousState = new Map<string, DijkstraState>();
  const queue = new MinHeap<DijkstraState>(
    (a, b) => a.arrivalTime - b.arrivalTime,
  );

  const initState: DijkstraState = {
    stopId: fromStopId,
    arrivalTime: departureTimeSeconds,
    previousStopId: null,
    previousEdge: null,
    totalWalking: 0,
    totalWaiting: 0,
  };

  queue.push(initState);
  visited.set(fromStopId, departureTimeSeconds);

  const tripIdsSeen = new Set<string>();
  let validTransitEdges = 0;

  while (queue.size > 0) {
    const current = queue.pop()!;

    if (current.arrivalTime > (visited.get(current.stopId) ?? Infinity)) {
      continue;
    }

    if (current.stopId === toStopId) {
      const path = reconstructPath(
        current,
        previousState,
        departureTimeSeconds,
      );

      if (isPathAmbiguous(path.legs)) {
        return {
          path: null,
          debug: {
            fromStopFound: true,
            toStopFound: true,
            nearbyTransitEdges,
            activeTripsChecked: tripIdsSeen.size,
            validTransitEdges,
            reason: 'Path is ambiguous (cycle detected)',
          },
        };
      }

      return {
        path,
        debug: {
          fromStopFound: true,
          toStopFound: true,
          nearbyTransitEdges,
          activeTripsChecked: tripIdsSeen.size,
          validTransitEdges,
          reason: 'Route found',
        },
      };
    }

    const edges = graph.adjacencyList.get(current.stopId) ?? [];

    for (const edge of edges) {
      if (edge.type === RoutingEdgeType.TRANSIT && edge.tripId) {
        tripIdsSeen.add(edge.tripId);
      }

      let newArrival: number;
      let newWalking = current.totalWalking;
      let newWaiting = current.totalWaiting;

      if (edge.type === RoutingEdgeType.WALK) {
        newArrival = current.arrivalTime + (edge.walkingTimeSeconds ?? 0);
        newWalking += edge.walkingTimeSeconds ?? 0;
      } else if (edge.type === RoutingEdgeType.TRANSFER) {
        newArrival = current.arrivalTime;
      } else if (edge.type === RoutingEdgeType.TRANSIT) {
        const dep = edge.departureTimeSeconds ?? 0;
        if (current.arrivalTime > dep) continue;
        validTransitEdges++;
        const waitTime = dep - current.arrivalTime;
        newWaiting += waitTime;
        newArrival = edge.arrivalTimeSeconds ?? dep;
      } else {
        continue;
      }

      if (newArrival < (visited.get(edge.toStopId) ?? Infinity)) {
        visited.set(edge.toStopId, newArrival);
        const newState: DijkstraState = {
          stopId: edge.toStopId,
          arrivalTime: newArrival,
          previousStopId: current.stopId,
          previousEdge: edge,
          totalWalking: newWalking,
          totalWaiting: newWaiting,
        };
        previousState.set(edge.toStopId, newState);
        queue.push(newState);
      }
    }
  }

  const edgesFromStart = graph.adjacencyList.get(fromStopId)?.length ?? 0;

  let reason = 'Destination unreachable from origin';
  if (edgesFromStart === 0) {
    reason = 'No edges from origin stop';
  } else if (nearbyTransitEdges === 0) {
    reason = 'No transit edges available from origin stop';
  } else if (validTransitEdges === 0 && tripIdsSeen.size > 0) {
    reason = 'No active transit edge found for requested time';
  }

  return {
    path: null,
    debug: {
      fromStopFound: true,
      toStopFound: true,
      nearbyTransitEdges,
      activeTripsChecked: tripIdsSeen.size,
      validTransitEdges,
      reason,
    },
  };
}

function deduplicateTransitEdges(
  edges: RoutingGraphEdge[],
): RoutingGraphEdge[] {
  if (edges.length <= 1) return edges;

  const bestTransit = new Map<string, RoutingGraphEdge>();

  for (const edge of edges) {
    if (edge.type !== RoutingEdgeType.TRANSIT) {
      continue;
    }

    const key = `${edge.toStopId}::${edge.routeId ?? ''}`;
    const best = bestTransit.get(key);
    if (
      !best ||
      (edge.travelTimeSeconds ?? 0) < (best.travelTimeSeconds ?? 0)
    ) {
      bestTransit.set(key, edge);
    }
  }

  if (bestTransit.size === 0) return edges;

  return edges.filter(
    (e) =>
      e.type !== RoutingEdgeType.TRANSIT ||
      bestTransit.get(`${e.toStopId}::${e.routeId ?? ''}`) === e,
  );
}

function findDirectRoutePaths(
  graph: RoutingGraph,
  fromStopId: string,
  toStopId: string,
): SearchResult[] {
  const fromEdges = graph.adjacencyList.get(fromStopId) ?? [];
  const seenRoutes = new Set<string>();
  const results: SearchResult[] = [];

  for (const edge of fromEdges) {
    if (edge.type !== RoutingEdgeType.TRANSIT) continue;
    const routeId = edge.routeId;
    if (!routeId || seenRoutes.has(routeId)) continue;
    seenRoutes.add(routeId);

    const path = findPathOnRoute(graph, fromStopId, toStopId, routeId);
    if (path) {
      results.push({
        path,
        debug: {
          fromStopFound: true,
          toStopFound: true,
          nearbyTransitEdges: 0,
          activeTripsChecked: 0,
          validTransitEdges: 0,
          reason: 'Direct route found',
        },
      });
    }
  }

  return results;
}

function findPathOnRoute(
  graph: RoutingGraph,
  fromStopId: string,
  toStopId: string,
  routeId: string,
): PathResult | null {
  if (fromStopId === toStopId) {
    return {
      totalDurationSeconds: 0,
      walkingDurationSeconds: 0,
      waitingDurationSeconds: 0,
      transferCount: 0,
      legs: [],
    };
  }

  const previousStop = new Map<string, string>();
  const previousEdge = new Map<string, RoutingGraphEdge>();
  const visited = new Set<string>();
  const queue: string[] = [fromStopId];
  visited.add(fromStopId);

  while (queue.length > 0) {
    const currentId = queue.shift()!;

    const edges = graph.adjacencyList.get(currentId) ?? [];
    for (const edge of edges) {
      if (edge.type !== RoutingEdgeType.TRANSIT) continue;
      if (edge.routeId !== routeId) continue;
      if (visited.has(edge.toStopId)) continue;

      visited.add(edge.toStopId);
      previousStop.set(edge.toStopId, currentId);
      previousEdge.set(edge.toStopId, edge);

      if (edge.toStopId === toStopId) {
        return buildSingleRouteLegs(
          fromStopId,
          toStopId,
          previousStop,
          previousEdge,
          routeId,
        );
      }

      queue.push(edge.toStopId);
    }
  }

  return null;
}

function buildSingleRouteLegs(
  fromStopId: string,
  toStopId: string,
  previousStop: Map<string, string>,
  previousEdge: Map<string, RoutingGraphEdge>,
  routeId: string,
): PathResult {
  const rawLegs: RouteLeg[] = [];
  let currentId = toStopId;

  while (currentId !== fromStopId) {
    const edge = previousEdge.get(currentId);
    const prevStop = previousStop.get(currentId);
    if (!edge || !prevStop) break;

    rawLegs.unshift({
      type: RoutingEdgeType.TRANSIT,
      fromStopId: edge.fromStopId,
      toStopId: edge.toStopId,
      durationSeconds:
        edge.travelTimeSeconds ??
        (edge.arrivalTimeSeconds ?? 0) - (edge.departureTimeSeconds ?? 0),
      routeId: routeId,
      routeName: edge.routeName ?? null,
      tripId: edge.tripId,
    });

    currentId = prevStop;
  }

  const mergedLegs = mergeConsecutiveLegs(rawLegs, 'trip');

  let totalDuration = 0;
  for (const leg of mergedLegs) {
    totalDuration += leg.durationSeconds;
  }

  return {
    strategy: 'FASTEST',
    totalDurationSeconds: totalDuration,
    walkingDurationSeconds: 0,
    waitingDurationSeconds: 0,
    transferCount: 0,
    legs: mergedLegs,
  };
}

export function findTimelessBestPath(
  graph: RoutingGraph,
  fromStopId: string,
  toStopId: string,
  profile: TimelessRoutingProfile = TIMELESS_ROUTING_PROFILES[0],
): SearchResult {
  const fromStopExists = graph.nodes.has(fromStopId);
  const toStopExists = graph.nodes.has(toStopId);

  const fromEdges = fromStopExists
    ? (graph.adjacencyList.get(fromStopId) ?? [])
    : [];
  const nearbyTransitEdges = fromEdges.filter(
    (e) => e.type === RoutingEdgeType.TRANSIT,
  ).length;

  if (fromStopId === toStopId) {
    return {
      path: {
        totalDurationSeconds: 0,
        walkingDurationSeconds: 0,
        waitingDurationSeconds: 0,
        transferCount: 0,
        legs: [],
      },
      debug: {
        fromStopFound: fromStopExists,
        toStopFound: toStopExists,
        nearbyTransitEdges,
        activeTripsChecked: 0,
        validTransitEdges: 0,
        reason: 'Origin and destination are the same',
      },
    };
  }

  if (!fromStopExists || !toStopExists) {
    return {
      path: null,
      debug: {
        fromStopFound: fromStopExists,
        toStopFound: toStopExists,
        nearbyTransitEdges,
        activeTripsChecked: 0,
        validTransitEdges: 0,
        reason: !fromStopExists
          ? 'Origin stop not found in graph'
          : 'Destination stop not found in graph',
      },
    };
  }

  const best = new Map<string, TimelessDijkstraState>();
  const previousState = new Map<string, TimelessDijkstraState>();
  const queue = new MinHeap<TimelessDijkstraState>(compareTimelessStates);

  const initState: TimelessDijkstraState = {
    stopId: fromStopId,
    cost: 0,
    totalDuration: 0,
    previousStopId: null,
    previousEdge: null,
    totalWalking: 0,
    transferCount: 0,
    legCount: 0,
    previousTransitRouteId: null,
  };

  queue.push(initState);
  best.set(fromStopId, initState);

  const tripIdsSeen = new Set<string>();
  let validTransitEdges = 0;

  while (queue.size > 0) {
    const current = queue.pop()!;

    const currentBest = best.get(current.stopId);
    if (currentBest && compareTimelessStates(current, currentBest) > 0) {
      continue;
    }

    if (current.stopId === toStopId) {
      const path = reconstructTimelessPath(
        current,
        previousState,
        profile.strategy,
      );

      if (isPathAmbiguous(path.legs)) {
        return {
          path: null,
          debug: {
            fromStopFound: true,
            toStopFound: true,
            nearbyTransitEdges,
            activeTripsChecked: tripIdsSeen.size,
            validTransitEdges,
            reason: 'Path is ambiguous (cycle detected)',
          },
        };
      }

      return {
        path,
        debug: {
          fromStopFound: true,
          toStopFound: true,
          nearbyTransitEdges,
          activeTripsChecked: tripIdsSeen.size,
          validTransitEdges,
          reason: 'Route found',
        },
      };
    }

    const rawEdges = graph.adjacencyList.get(current.stopId) ?? [];
    const edges = deduplicateTransitEdges(rawEdges);

    for (const edge of edges) {
      const edgeDuration = getTimelessEdgeDuration(edge);
      if (edgeDuration === null) continue;

      const isTransferWalk =
        edge.type === RoutingEdgeType.WALK &&
        current.previousTransitRouteId !== null;

      const isSameRouteWalkShortcut =
        isTransferWalk &&
        hasTransitContinuationOnRoute(
          edges,
          edge.toStopId,
          current.previousTransitRouteId!,
        );

      if (edge.type === RoutingEdgeType.TRANSIT && edge.tripId) {
        tripIdsSeen.add(edge.tripId);
        validTransitEdges++;
      }

      const isTransitTransfer =
        edge.type === RoutingEdgeType.TRANSIT &&
        current.previousTransitRouteId !== null &&
        edge.routeId !== current.previousTransitRouteId;

      const newTransferCount =
        current.transferCount + (isTransitTransfer ? 1 : 0);
      if (newTransferCount > MAX_TRANSFERS) continue;

      const newState: TimelessDijkstraState = {
        stopId: edge.toStopId,
        cost:
          current.cost +
          getTimelessEdgeCost(
            edge,
            edgeDuration,
            isTransitTransfer,
            isSameRouteWalkShortcut,
            isTransferWalk,
            profile,
          ),
        totalDuration: current.totalDuration + edgeDuration,
        previousStopId: current.stopId,
        previousEdge: edge,
        totalWalking:
          current.totalWalking +
          (edge.type === RoutingEdgeType.WALK ? edgeDuration : 0),
        transferCount: newTransferCount,
        legCount: current.legCount + 1,
        previousTransitRouteId:
          edge.type === RoutingEdgeType.TRANSIT
            ? (edge.routeId ?? null)
            : current.previousTransitRouteId,
      };

      const existing = best.get(edge.toStopId);
      if (!existing || compareTimelessStates(newState, existing) < 0) {
        best.set(edge.toStopId, newState);
        previousState.set(edge.toStopId, newState);
        queue.push(newState);
      }
    }
  }

  const edgesFromStart = graph.adjacencyList.get(fromStopId)?.length ?? 0;

  let reason = 'Destination unreachable from origin';
  if (edgesFromStart === 0) {
    reason = 'No edges from origin stop';
  } else if (nearbyTransitEdges === 0) {
    reason = 'No transit edges available from origin stop';
  }

  return {
    path: null,
    debug: {
      fromStopFound: true,
      toStopFound: true,
      nearbyTransitEdges,
      activeTripsChecked: tripIdsSeen.size,
      validTransitEdges,
      reason,
    },
  };
}

function reconstructPath(
  endState: DijkstraState,
  previousState: Map<string, DijkstraState>,
  startTime: number,
): PathResult {
  const rawLegs: RouteLeg[] = [];
  let currentId = endState.stopId;

  while (currentId) {
    const state = previousState.get(currentId);
    if (!state || !state.previousEdge) break;

    const edge = state.previousEdge;
    let duration = state.arrivalTime - (edge.departureTimeSeconds ?? 0);
    if (edge.type === RoutingEdgeType.WALK) {
      duration = edge.walkingTimeSeconds ?? 0;
    } else if (edge.type === RoutingEdgeType.TRANSFER) {
      duration = 0;
    }

    rawLegs.unshift({
      type: edge.type,
      fromStopId: edge.fromStopId,
      toStopId: edge.toStopId,
      durationSeconds: duration,
      distanceMeters: edge.distanceMeters,
      routeId: edge.routeId,
      routeName: edge.routeName ?? null,
      tripId: edge.tripId,
      departureTimeSeconds: edge.departureTimeSeconds,
      arrivalTimeSeconds: edge.arrivalTimeSeconds,
    });

    currentId = state.previousStopId ?? '';
  }

  const mergedLegs = mergeConsecutiveLegs(rawLegs, 'trip');

  let transferCount = 0;
  for (let i = 1; i < mergedLegs.length; i++) {
    if (
      mergedLegs[i].type === RoutingEdgeType.TRANSIT &&
      mergedLegs[i - 1].type === RoutingEdgeType.TRANSIT &&
      mergedLegs[i].tripId !== mergedLegs[i - 1].tripId
    ) {
      transferCount++;
    }
  }

  return {
    totalDurationSeconds: endState.arrivalTime - startTime,
    walkingDurationSeconds: endState.totalWalking,
    waitingDurationSeconds: endState.totalWaiting,
    transferCount,
    legs: mergedLegs,
  };
}

function reconstructTimelessPath(
  endState: TimelessDijkstraState,
  previousState: Map<string, TimelessDijkstraState>,
  strategy?: TimelessRouteStrategy,
): PathResult {
  const rawLegs: RouteLeg[] = [];
  let currentId = endState.stopId;

  while (currentId) {
    const state = previousState.get(currentId);
    if (!state || !state.previousEdge) break;

    const edge = state.previousEdge;
    const duration = getTimelessEdgeDuration(edge);
    if (duration === null) break;

    rawLegs.unshift({
      type: edge.type,
      fromStopId: edge.fromStopId,
      toStopId: edge.toStopId,
      durationSeconds: duration,
      distanceMeters: edge.distanceMeters,
      routeId: edge.routeId,
      routeName: edge.routeName ?? null,
      tripId: edge.tripId,
    });

    currentId = state.previousStopId ?? '';
  }

  const mergedLegs = collapseSameRouteWalkGaps(
    mergeConsecutiveLegs(rawLegs, 'trip'),
  );
  const hiddenWalkingSeconds = endState.totalWalking - sumWalking(mergedLegs);

  return {
    strategy,
    totalDurationSeconds: endState.totalDuration,
    walkingDurationSeconds: endState.totalWalking - hiddenWalkingSeconds,
    waitingDurationSeconds: 0,
    transferCount: endState.transferCount,
    legs: mergedLegs,
  };
}

export function findTimelessBestPaths(
  graph: RoutingGraph,
  fromStopId: string,
  toStopId: string,
  maxOptions = 3,
  profiles?: TimelessRoutingProfile[],
): SearchResult[] {
  const results: SearchResult[] = [];
  const seenPaths = new Set<string>();

  const directPaths = findDirectRoutePaths(graph, fromStopId, toStopId);
  for (const direct of directPaths) {
    if (!direct.path) continue;
    if (isPathAmbiguous(direct.path.legs)) continue;
    const signature = getPathSignature(direct.path);
    if (seenPaths.has(signature)) continue;
    direct.path.strategy = 'FASTEST';
    seenPaths.add(signature);
    results.push(direct);
    if (results.length >= maxOptions) break;
  }

  if (results.length >= maxOptions) return results;

  const effectiveProfiles = profiles ?? TIMELESS_ROUTING_PROFILES;

  for (const profile of effectiveProfiles) {
    const result = findTimelessBestPath(graph, fromStopId, toStopId, profile);
    if (!result.path) {
      if (results.length === 0) results.push(result);
      continue;
    }

    if (isPathAmbiguous(result.path.legs)) continue;

    const signature = getPathSignature(result.path);
    if (seenPaths.has(signature)) continue;

    result.path.strategy = profile.strategy;
    seenPaths.add(signature);
    results.push(result);

    if (results.length >= maxOptions) break;
  }

  return results.length > 0
    ? results
    : [findTimelessBestPath(graph, fromStopId, toStopId)];
}

function getTimelessEdgeDuration(edge: RoutingGraphEdge): number | null {
  if (edge.type === RoutingEdgeType.WALK) {
    return edge.walkingTimeSeconds ?? null;
  }

  if (edge.type === RoutingEdgeType.TRANSFER) {
    return 0;
  }

  if (edge.type === RoutingEdgeType.TRANSIT) {
    if (edge.travelTimeSeconds && edge.travelTimeSeconds > 0) {
      return edge.travelTimeSeconds;
    }

    if (
      edge.arrivalTimeSeconds !== undefined &&
      edge.departureTimeSeconds !== undefined
    ) {
      const travelTime = edge.arrivalTimeSeconds - edge.departureTimeSeconds;
      return travelTime > 0 ? travelTime : null;
    }
  }

  return null;
}

function collapseSameRouteWalkGaps(legs: RouteLeg[]): RouteLeg[] {
  if (legs.length < 3) return legs;

  const result: RouteLeg[] = [];
  let i = 0;

  while (i < legs.length) {
    const current = legs[i];
    const middle = legs[i + 1];
    const next = legs[i + 2];

    if (isSameRouteWalkGap(current, middle, next)) {
      result.push({
        type: RoutingEdgeType.TRANSIT,
        fromStopId: current.fromStopId,
        toStopId: next.toStopId,
        durationSeconds:
          current.durationSeconds +
          middle.durationSeconds +
          next.durationSeconds,
        routeId: current.routeId,
        routeName: current.routeName ?? next.routeName ?? null,
        tripId: current.tripId === next.tripId ? current.tripId : null,
        departureTimeSeconds: current.departureTimeSeconds,
        arrivalTimeSeconds: next.arrivalTimeSeconds,
      });
      i += 3;
      continue;
    }

    result.push(current);
    i++;
  }

  return result;
}

function isSameRouteWalkGap(
  current?: RouteLeg,
  middle?: RouteLeg,
  next?: RouteLeg,
): current is RouteLeg {
  return (
    current?.type === RoutingEdgeType.TRANSIT &&
    middle?.type === RoutingEdgeType.WALK &&
    next?.type === RoutingEdgeType.TRANSIT &&
    current.routeId !== null &&
    current.routeId !== undefined &&
    current.routeId === next.routeId
  );
}

function sumWalking(legs: RouteLeg[]): number {
  return legs.reduce(
    (total, leg) =>
      total + (leg.type === RoutingEdgeType.WALK ? leg.durationSeconds : 0),
    0,
  );
}

function getTimelessEdgeCost(
  edge: RoutingGraphEdge,
  duration: number,
  isTransitTransfer: boolean,
  isSameRouteWalkShortcut: boolean,
  isTransferWalk: boolean,
  profile: TimelessRoutingProfile,
): number {
  const walkingPenalty =
    edge.type === RoutingEdgeType.WALK
      ? duration * profile.walkingPenaltyMultiplier
      : 0;
  const sameRouteWalkPenalty = isSameRouteWalkShortcut
    ? profile.sameRouteWalkPenaltySeconds
    : 0;
  const transferPenalty = isTransitTransfer
    ? profile.routeChangePenaltySeconds
    : 0;
  const transferWalkPenalty = isTransferWalk
    ? profile.transferWalkingPenaltySeconds
    : 0;

  return (
    duration +
    walkingPenalty +
    sameRouteWalkPenalty +
    transferPenalty +
    transferWalkPenalty
  );
}

function hasTransitContinuationOnRoute(
  edges: RoutingGraphEdge[],
  toStopId: string,
  routeId: string,
): boolean {
  return edges.some(
    (candidate) =>
      candidate.type === RoutingEdgeType.TRANSIT &&
      candidate.toStopId === toStopId &&
      candidate.routeId === routeId,
  );
}

function compareTimelessStates(
  a: TimelessDijkstraState,
  b: TimelessDijkstraState,
): number {
  return (
    a.cost - b.cost ||
    a.transferCount - b.transferCount ||
    a.totalDuration - b.totalDuration ||
    a.totalWalking - b.totalWalking ||
    a.legCount - b.legCount
  );
}

function getPathSignature(path: PathResult): string {
  return path.legs
    .map(
      (leg) =>
        `${leg.type}:${leg.fromStopId}:${leg.toStopId}:${leg.routeId ?? ''}`,
    )
    .join('|');
}

export function isPathAmbiguous(legs: RouteLeg[]): boolean {
  if (legs.length === 0) return false;

  const visited = new Set<string>();
  visited.add(legs[0].fromStopId);

  for (const leg of legs) {
    if (visited.has(leg.toStopId)) return true;
    visited.add(leg.toStopId);
  }

  return false;
}

const MAX_TRANSFERS = 4;

export const TIMELESS_ROUTING_PROFILES: TimelessRoutingProfile[] = [
  {
    strategy: 'FASTEST',
    walkingPenaltyMultiplier: 0.5,
    routeChangePenaltySeconds: 300,
    sameRouteWalkPenaltySeconds: 1800,
    transferWalkingPenaltySeconds: 0,
  },
  {
    strategy: 'FEWER_TRANSITS',
    walkingPenaltyMultiplier: 1,
    routeChangePenaltySeconds: 1200,
    sameRouteWalkPenaltySeconds: 3600,
    transferWalkingPenaltySeconds: 0,
  },
  {
    strategy: 'LESS_WALKING',
    walkingPenaltyMultiplier: 0.5,
    routeChangePenaltySeconds: 300,
    sameRouteWalkPenaltySeconds: 1800,
    transferWalkingPenaltySeconds: 7200,
  },
];

function mergeConsecutiveLegs(
  rawLegs: RouteLeg[],
  transitMergeBy: 'trip' | 'route',
): RouteLeg[] {
  if (rawLegs.length <= 1) return rawLegs;

  const result: RouteLeg[] = [];
  let current = rawLegs[0];

  for (let i = 1; i < rawLegs.length; i++) {
    const next = rawLegs[i];
    if (current.type === next.type && current.type === RoutingEdgeType.WALK) {
      current = {
        type: RoutingEdgeType.WALK,
        fromStopId: current.fromStopId,
        toStopId: next.toStopId,
        durationSeconds: current.durationSeconds + next.durationSeconds,
        distanceMeters:
          (current.distanceMeters ?? 0) + (next.distanceMeters ?? 0),
      };
    } else if (
      current.type === next.type &&
      current.type === RoutingEdgeType.TRANSIT &&
      isSameTransitSegment(current, next, transitMergeBy)
    ) {
      current = {
        type: RoutingEdgeType.TRANSIT,
        fromStopId: current.fromStopId,
        toStopId: next.toStopId,
        durationSeconds: current.durationSeconds + next.durationSeconds,
        routeId: current.routeId,
        routeName: current.routeName ?? null,
        tripId: current.tripId === next.tripId ? current.tripId : null,
        departureTimeSeconds: current.departureTimeSeconds,
        arrivalTimeSeconds: next.arrivalTimeSeconds,
      };
    } else {
      result.push(current);
      current = next;
    }
  }
  result.push(current);

  return result;
}

function isSameTransitSegment(
  current: RouteLeg,
  next: RouteLeg,
  transitMergeBy: 'trip' | 'route',
): boolean {
  if (transitMergeBy === 'trip') {
    return current.tripId === next.tripId;
  }

  return (
    current.routeId !== null &&
    current.routeId !== undefined &&
    current.routeId === next.routeId
  );
}
