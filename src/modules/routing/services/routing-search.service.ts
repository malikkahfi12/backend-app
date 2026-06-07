import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../../config/app.config';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { RoutingGraphService } from '../graph/routing-graph.service';
import {
  findEarliestArrivalPath,
  findTimelessBestPaths,
  PathResult,
  RouteLeg,
} from '../algorithms/dijkstra-routing.algorithm';
import { RoutingResponseDto } from '../dto/routing-response.dto';
import { RouteOptionDto } from '../dto/route-option.dto';
import { RouteLegDto } from '../dto/route-leg.dto';
import { RoutingGraph, RoutingGraphNode } from '../graph/routing-graph.types';
import { RoutingEdgeType } from '../enums/routing-edge-type.enum';
import {
  WALK_GEOMETRY_STADIAMAPS_MIN_DISTANCE_METERS,
  STADIAMAPS_DIRECTIONS_TIMEOUT_MS,
} from '../constants/routing.constants';
import {
  encodePolyline6,
  decodePolyline6,
} from '../../../common/utils/polyline6';

interface StopCandidate {
  stopId: string;
  score: number;
}

interface RoutePairCandidate {
  fromStopId: string;
  toStopId: string;
  fromScore: number;
  toScore: number;
  response: RoutingResponseDto;
}

interface RouteSearchInputs {
  fromStopId?: string;
  fromStopName?: string;
  toStopId?: string;
  toStopName?: string;
  departureTimeSeconds?: number;
}

const NAME_CANDIDATE_RADIUS_METERS = 150;
const MAX_NAME_CANDIDATES = 10;
const MAX_ROUTE_OPTIONS = 3;

const DIRECTIONS_CACHE_TTL_SECONDS = 86_400;

@Injectable()
export class RoutingSearchService {
  private readonly logger = new Logger(RoutingSearchService.name);
  private readonly stadiamapsApiKey: string;
  private readonly stadiamapsBaseUrl: string;

  constructor(
    private readonly routingGraphService: RoutingGraphService,
    private readonly prismaService: PrismaService,
    configService: ConfigService<AppConfig, true>,
    private readonly redis: RedisService,
  ) {
    this.stadiamapsApiKey = configService.get('stadiamaps.apiKey', {
      infer: true,
    });
    this.stadiamapsBaseUrl = configService.get('stadiamaps.baseUrl', {
      infer: true,
    });
  }

  async searchRoute(
    fromStopId: string,
    toStopId: string,
    departureTimeSeconds?: number,
  ): Promise<RoutingResponseDto> {
    const response: RoutingResponseDto = {
      fromStopId,
      toStopId,
      departureTimeSeconds,
      options: [],
    };

    const graph = this.routingGraphService.getGraph();

    if (!graph) {
      this.logger.log(
        `Route search debug: fromStopId=${fromStopId}, toStopId=${toStopId}, reason=Graph not built`,
      );
      return response;
    }

    response.fromStopName = graph.nodes.get(fromStopId)?.name;
    response.toStopName = graph.nodes.get(toStopId)?.name;

    const fromStopFound = graph.nodes.has(fromStopId);
    const toStopFound = graph.nodes.has(toStopId);

    const results = this.findRouteResults(
      graph,
      fromStopId,
      toStopId,
      departureTimeSeconds,
    );

    const result = results[0];
    for (const item of results) {
      item.debug.fromStopFound = fromStopFound;
      item.debug.toStopFound = toStopFound;
    }

    const d = result.debug;
    this.logger.log(
      `Route search debug: mode=${departureTimeSeconds === undefined ? 'timeless' : 'scheduled'}, fromStopFound=${d.fromStopFound}, toStopFound=${d.toStopFound}, nearbyTransitEdges=${d.nearbyTransitEdges}, activeTripsChecked=${d.activeTripsChecked}, validTransitEdges=${d.validTransitEdges}, reason=${d.reason}`,
    );

    for (const item of results) {
      if (!item.path) continue;
      response.options.push(this.toRouteOption(item.path, graph));
    }

    response.options.sort(sortOptionsByQuality);

    await this.populateLegGeometries(response, graph);

    return response;
  }

  async searchRouteByInputs(
    inputs: RouteSearchInputs,
  ): Promise<RoutingResponseDto> {
    const graph = this.routingGraphService.getGraph();
    if (!graph) {
      const fromStopId = inputs.fromStopId ?? inputs.fromStopName ?? '';
      const toStopId = inputs.toStopId ?? inputs.toStopName ?? '';
      this.logger.log(
        `Route search debug: fromStopId=${fromStopId}, toStopId=${toStopId}, reason=Graph not built`,
      );
      return {
        fromStopId,
        toStopId,
        departureTimeSeconds: inputs.departureTimeSeconds,
        options: [],
      };
    }

    const fromCandidates = this.resolveInputCandidates(
      graph,
      inputs.fromStopId,
      inputs.fromStopName,
      'origin',
    );
    const toCandidates = this.resolveInputCandidates(
      graph,
      inputs.toStopId,
      inputs.toStopName,
      'destination',
    );

    const routedPairs: RoutePairCandidate[] = [];

    for (const fromCandidate of fromCandidates) {
      for (const toCandidate of toCandidates) {
        const response = await this.searchRouteOnGraph(
          graph,
          fromCandidate.stopId,
          toCandidate.stopId,
          inputs.departureTimeSeconds,
        );

        if (response.options.length === 0) continue;

        routedPairs.push({
          fromStopId: fromCandidate.stopId,
          toStopId: toCandidate.stopId,
          fromScore: fromCandidate.score,
          toScore: toCandidate.score,
          response,
        });
      }
    }

    if (routedPairs.length === 0) {
      const fromCandidate = fromCandidates[0];
      const toCandidate = toCandidates[0];
      return await this.searchRouteOnGraph(
        graph,
        fromCandidate.stopId,
        toCandidate.stopId,
        inputs.departureTimeSeconds,
      );
    }

    routedPairs.sort((a, b) => this.compareRoutePairs(a, b));
    return routedPairs[0].response;
  }

  resolveStopIdFromName(name: string): string {
    const graph = this.routingGraphService.getGraph();
    if (!graph) {
      throw new BadRequestException('Routing graph not built');
    }

    const lower = name.toLowerCase().trim();
    const matches: string[] = [];

    for (const [id, node] of graph.nodes) {
      if (
        node.name.toLowerCase().includes(lower) ||
        node.stopId.toLowerCase() === lower
      ) {
        matches.push(id);
      }
    }

    if (matches.length === 0) {
      throw new BadRequestException(
        `Stop name '${name}' not found. Try searching with GET /stops?q=${encodeURIComponent(name)}`,
      );
    }

    if (matches.length > 1) {
      const suggestions = matches
        .slice(0, 5)
        .map((id) => {
          const node = graph.nodes.get(id);
          return `${node?.name} (${id})`;
        })
        .join(', ');

      throw new BadRequestException(
        `Multiple stops match '${name}': ${suggestions}. Use a more specific name or stopId.`,
      );
    }

    return matches[0];
  }

  private toRouteOption(path: PathResult, graph: RoutingGraph): RouteOptionDto {
    return {
      strategy: path.strategy,
      totalDurationSeconds: path.totalDurationSeconds,
      walkingDurationSeconds: path.walkingDurationSeconds,
      waitingDurationSeconds: path.waitingDurationSeconds,
      transferCount: path.transferCount,
      legs: path.legs.map((leg) => this.toRouteLeg(leg, graph)),
    };
  }

  private toRouteLeg(leg: RouteLeg, graph: RoutingGraph): RouteLegDto {
    return {
      type: leg.type,
      fromStopId: leg.fromStopId,
      toStopId: leg.toStopId,
      fromStopName: graph.nodes.get(leg.fromStopId)?.name,
      toStopName: graph.nodes.get(leg.toStopId)?.name,
      fromCoordinates: toCoordinateString(
        graph.nodes.get(leg.fromStopId)?.latitude,
        graph.nodes.get(leg.fromStopId)?.longitude,
      ),
      toCoordinates: toCoordinateString(
        graph.nodes.get(leg.toStopId)?.latitude,
        graph.nodes.get(leg.toStopId)?.longitude,
      ),
      durationSeconds: leg.durationSeconds,
      distanceMeters: leg.distanceMeters,
      tripId: leg.tripId ?? null,
      departureTimeSeconds: leg.departureTimeSeconds,
      arrivalTimeSeconds: leg.arrivalTimeSeconds,
      routeId: leg.routeId ?? null,
      routeName: leg.routeName ?? null,
    };
  }

  private async populateLegGeometries(
    response: RoutingResponseDto,
    graph: RoutingGraph,
  ): Promise<void> {
    for (const option of response.options) {
      for (const leg of option.legs) {
        const coords = await this.resolveLegGeometry(leg, graph);
        leg.geometry = coords?.length ? encodePolyline6(coords) : undefined;
      }
    }
  }

  private async resolveLegGeometry(
    leg: RouteLegDto,
    graph: RoutingGraph,
  ): Promise<number[][] | undefined> {
    if (leg.type === RoutingEdgeType.WALK) {
      return this.resolveWalkGeometry(leg, graph);
    }

    if (leg.tripId) {
      return this.resolveTransitShapeSegment(leg, graph);
    }

    return this.straightLineGeometry(leg, graph);
  }

  private async resolveTransitShapeSegment(
    leg: RouteLegDto,
    graph: RoutingGraph,
  ): Promise<number[][] | undefined> {
    try {
      const db = this.prismaService as any;

      const trip = await db.trip.findUnique({
        where: { id: leg.tripId },
        select: { feedSourceId: true, externalShapeId: true },
      });

      if (!trip || !trip.externalShapeId) {
        const osmGeo = await this.resolveOsmLegGeometry(leg, graph);
        if (osmGeo) return osmGeo;
        return this.straightLineGeometry(leg, graph);
      }

      const shapePoints = await db.shape.findMany({
        where: {
          feedSourceId: trip.feedSourceId,
          externalShapeId: trip.externalShapeId,
        },
        orderBy: { shapePtSequence: 'asc' },
      });

      if (!shapePoints || shapePoints.length === 0) {
        const osmGeo = await this.resolveOsmLegGeometry(leg, graph);
        if (osmGeo) return osmGeo;
        return this.straightLineGeometry(leg, graph);
      }

      const coordinates: number[][] = shapePoints.map(
        (p: Record<string, unknown>) => [
          p.shapePtLon as number,
          p.shapePtLat as number,
        ],
      );

      const fromNode = graph.nodes.get(leg.fromStopId ?? '');
      const toNode = graph.nodes.get(leg.toStopId ?? '');

      if (!fromNode || !toNode) {
        return this.straightLineGeometry(leg, graph);
      }

      const startIndex = findClosestShapePointIndex(
        coordinates,
        fromNode.latitude,
        fromNode.longitude,
      );

      if (startIndex === -1) {
        return this.straightLineGeometry(leg, graph);
      }

      const endIndex = findClosestShapePointIndex(
        coordinates,
        toNode.latitude,
        toNode.longitude,
      );

      if (endIndex === -1) {
        return this.straightLineGeometry(leg, graph);
      }

      const slice = coordinates.slice(
        Math.min(startIndex, endIndex),
        Math.max(startIndex, endIndex) + 1,
      );

      if (slice.length === 0) {
        return this.straightLineGeometry(leg, graph);
      }

      return slice;
    } catch {
      return this.straightLineGeometry(leg, graph);
    }
  }

  private async resolveWalkGeometry(
    leg: RouteLegDto,
    graph: RoutingGraph,
  ): Promise<number[][] | undefined> {
    if (
      leg.distanceMeters != null &&
      leg.distanceMeters < WALK_GEOMETRY_STADIAMAPS_MIN_DISTANCE_METERS
    ) {
      return this.straightLineGeometry(leg, graph);
    }

    return (
      (await this.fetchStadiaMapsWalkingGeometry(leg, graph)) ??
      this.straightLineGeometry(leg, graph)
    );
  }

  private async fetchStadiaMapsWalkingGeometry(
    leg: RouteLegDto,
    graph: RoutingGraph,
  ): Promise<number[][] | undefined> {
    const fromNode = graph.nodes.get(leg.fromStopId ?? '');
    const toNode = graph.nodes.get(leg.toStopId ?? '');

    if (
      !fromNode ||
      !toNode ||
      fromNode.latitude == null ||
      fromNode.longitude == null ||
      toNode.latitude == null ||
      toNode.longitude == null
    ) {
      return undefined;
    }

    const cacheKey = `stadiamaps:directions:${fromNode.latitude.toFixed(5)}:${fromNode.longitude.toFixed(5)}:${toNode.latitude.toFixed(5)}:${toNode.longitude.toFixed(5)}`;

    try {
      const cached = await this.redis.get<number[][]>(cacheKey);
      if (cached !== null) {
        this.logger.log('Cache HIT for Stadia Maps walking directions');
        return cached;
      }
    } catch {
      this.logger.warn(
        'Redis get failed for directions cache, falling through to API',
      );
    }

    const url = `${this.stadiamapsBaseUrl}/route/v1?api_key=${encodeURIComponent(this.stadiamapsApiKey)}`;
    const body = JSON.stringify({
      locations: [
        { lat: fromNode.latitude, lon: fromNode.longitude },
        { lat: toNode.latitude, lon: toNode.longitude },
      ],
      costing: 'pedestrian',
      directions_type: 'none',
      shape_format: 'polyline6',
    });

    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      STADIAMAPS_DIRECTIONS_TIMEOUT_MS,
    );

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: controller.signal,
      });

      if (!response.ok) {
        this.logger.warn(
          `Stadia Maps Directions returned ${response.status}: ${await response.text().catch(() => 'unknown error')}`,
        );
        return undefined;
      }

      const data = await response.json();

      const shape = data?.trip?.legs?.[0]?.shape;
      if (!shape || typeof shape !== 'string') {
        this.logger.warn(`Stadia Maps Directions returned no trip leg shape`);
        return undefined;
      }

      const coordinates = decodePolyline6(shape);
      if (!coordinates.length) {
        this.logger.warn(`Stadia Maps Directions returned invalid geometry`);
        return undefined;
      }

      try {
        await this.redis.set(
          cacheKey,
          coordinates,
          DIRECTIONS_CACHE_TTL_SECONDS,
        );
      } catch {
        this.logger.warn(`Redis set failed for directions cache`);
      }

      return coordinates;
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        this.logger.warn(
          `Stadia Maps walking directions failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
      return undefined;
    } finally {
      clearTimeout(timer);
    }
  }

  private async resolveOsmLegGeometry(
    leg: RouteLegDto,
    graph: RoutingGraph,
  ): Promise<number[][] | undefined> {
    try {
      if (!leg.routeId) return undefined;

      const db = this.prismaService as any;
      const rows = await db.$queryRawUnsafe(
        `SELECT ST_AsGeoJSON(r2.geometry)::json AS geometry
         FROM gtfs_routes r1
         JOIN gtfs_routes r2 ON r2.id = r1.matched_osm_route_id
         WHERE r1.id = $1
           AND r1.geometry_source = 'osm'
           AND r2.geometry IS NOT NULL`,
        leg.routeId,
      );

      if (!rows || rows.length === 0) return undefined;

      const geom = rows[0]?.geometry as
        | { type: string; coordinates: number[][] }
        | undefined;
      if (!geom || geom.type !== 'LineString' || !geom.coordinates?.length) {
        return undefined;
      }

      const fromNode = graph.nodes.get(leg.fromStopId ?? '');
      const toNode = graph.nodes.get(leg.toStopId ?? '');

      if (!fromNode || !toNode) return undefined;

      const startIndex = findClosestShapePointIndex(
        geom.coordinates,
        fromNode.latitude,
        fromNode.longitude,
      );

      if (startIndex === -1) return undefined;

      const endIndex = findClosestShapePointIndex(
        geom.coordinates,
        toNode.latitude,
        toNode.longitude,
      );

      if (endIndex === -1) return undefined;

      const slice = geom.coordinates.slice(
        Math.min(startIndex, endIndex),
        Math.max(startIndex, endIndex) + 1,
      );

      if (slice.length === 0) return undefined;

      return slice;
    } catch {
      return undefined;
    }
  }

  private straightLineGeometry(
    leg: RouteLegDto,
    graph: RoutingGraph,
  ): number[][] | undefined {
    const fromNode = graph.nodes.get(leg.fromStopId ?? '');
    const toNode = graph.nodes.get(leg.toStopId ?? '');

    if (
      !fromNode ||
      !toNode ||
      fromNode.latitude == null ||
      fromNode.longitude == null ||
      toNode.latitude == null ||
      toNode.longitude == null
    ) {
      return undefined;
    }

    return [
      [fromNode.longitude, fromNode.latitude],
      [toNode.longitude, toNode.latitude],
    ];
  }

  private async searchRouteOnGraph(
    graph: RoutingGraph,
    fromStopId: string,
    toStopId: string,
    departureTimeSeconds?: number,
  ): Promise<RoutingResponseDto> {
    const response: RoutingResponseDto = {
      fromStopId,
      toStopId,
      fromStopName: graph.nodes.get(fromStopId)?.name,
      toStopName: graph.nodes.get(toStopId)?.name,
      departureTimeSeconds,
      options: [],
    };

    const fromStopFound = graph.nodes.has(fromStopId);
    const toStopFound = graph.nodes.has(toStopId);
    const results = this.findRouteResults(
      graph,
      fromStopId,
      toStopId,
      departureTimeSeconds,
    );

    for (const item of results) {
      item.debug.fromStopFound = fromStopFound;
      item.debug.toStopFound = toStopFound;
    }

    const d = results[0].debug;
    this.logger.log(
      `Route search debug: mode=${departureTimeSeconds === undefined ? 'timeless' : 'scheduled'}, fromStopFound=${d.fromStopFound}, toStopFound=${d.toStopFound}, nearbyTransitEdges=${d.nearbyTransitEdges}, activeTripsChecked=${d.activeTripsChecked}, validTransitEdges=${d.validTransitEdges}, reason=${d.reason}`,
    );

    for (const item of results) {
      if (!item.path) continue;
      response.options.push(this.toRouteOption(item.path, graph));
    }

    response.options.sort(sortOptionsByQuality);

    await this.populateLegGeometries(response, graph);

    return response;
  }

  private findRouteResults(
    graph: RoutingGraph,
    fromStopId: string,
    toStopId: string,
    departureTimeSeconds?: number,
  ) {
    return departureTimeSeconds === undefined
      ? findTimelessBestPaths(graph, fromStopId, toStopId, MAX_ROUTE_OPTIONS)
      : [
          findEarliestArrivalPath(
            graph,
            fromStopId,
            toStopId,
            departureTimeSeconds,
          ),
        ];
  }

  private resolveInputCandidates(
    graph: RoutingGraph,
    stopId: string | undefined,
    stopName: string | undefined,
    label: 'origin' | 'destination',
  ): StopCandidate[] {
    if (stopId) {
      return [{ stopId, score: 0 }];
    }

    if (!stopName) {
      throw new BadRequestException(`Missing ${label} stop id or name`);
    }

    return this.resolveStopCandidates(stopName, graph);
  }

  private resolveStopCandidates(
    name: string,
    graph: RoutingGraph,
  ): StopCandidate[] {
    const query = normalizeStopName(name);
    const queryWithoutOppositePrefix = stripOppositeSidePrefix(query);
    const candidates = new Map<string, StopCandidate>();

    for (const [id, node] of graph.nodes) {
      const nodeName = normalizeStopName(node.name);
      const nodeNameWithoutOppositePrefix = stripOppositeSidePrefix(nodeName);
      const score = getNameMatchScore(
        query,
        queryWithoutOppositePrefix,
        nodeName,
        nodeNameWithoutOppositePrefix,
      );

      if (score !== null) {
        addCandidate(candidates, id, score);
      }
    }

    const anchorCandidates = [...candidates.values()];
    for (const anchor of anchorCandidates) {
      const anchorNode = graph.nodes.get(anchor.stopId);
      if (!anchorNode) continue;

      for (const [id, node] of graph.nodes) {
        const distanceMeters = getDistanceMeters(anchorNode, node);
        if (distanceMeters > NAME_CANDIDATE_RADIUS_METERS) continue;
        addCandidate(candidates, id, anchor.score + 25 + distanceMeters / 10);
      }
    }

    const sortedCandidates = [...candidates.values()]
      .sort((a, b) => a.score - b.score || a.stopId.localeCompare(b.stopId))
      .slice(0, MAX_NAME_CANDIDATES);

    if (sortedCandidates.length === 0) {
      throw new BadRequestException(
        `Stop name '${name}' not found. Try searching with GET /stops?q=${encodeURIComponent(name)}`,
      );
    }

    return sortedCandidates;
  }

  private compareRoutePairs(
    a: RoutePairCandidate,
    b: RoutePairCandidate,
  ): number {
    const aBest = a.response.options[0];
    const bBest = b.response.options[0];

    return (
      scoreRouteOption(aBest, a.fromScore + a.toScore) -
        scoreRouteOption(bBest, b.fromScore + b.toScore) ||
      aBest.transferCount - bBest.transferCount ||
      aBest.walkingDurationSeconds - bBest.walkingDurationSeconds ||
      aBest.totalDurationSeconds - bBest.totalDurationSeconds ||
      a.fromStopId.localeCompare(b.fromStopId) ||
      a.toStopId.localeCompare(b.toStopId)
    );
  }
}

function addCandidate(
  candidates: Map<string, StopCandidate>,
  stopId: string,
  score: number,
): void {
  const existing = candidates.get(stopId);
  if (!existing || score < existing.score) {
    candidates.set(stopId, { stopId, score });
  }
}

function getNameMatchScore(
  query: string,
  queryWithoutOppositePrefix: string,
  nodeName: string,
  nodeNameWithoutOppositePrefix: string,
): number | null {
  if (nodeName === query) return 0;
  if (nodeNameWithoutOppositePrefix === queryWithoutOppositePrefix) return 10;
  if (nodeName.startsWith(query) || query.startsWith(nodeName)) return 20;
  if (
    nodeNameWithoutOppositePrefix.startsWith(queryWithoutOppositePrefix) ||
    queryWithoutOppositePrefix.startsWith(nodeNameWithoutOppositePrefix)
  ) {
    return 30;
  }
  if (nodeName.includes(query) || query.includes(nodeName)) return 35;
  if (
    nodeNameWithoutOppositePrefix.includes(queryWithoutOppositePrefix) ||
    queryWithoutOppositePrefix.includes(nodeNameWithoutOppositePrefix)
  ) {
    return 40;
  }

  const distance = levenshteinDistance(query, nodeName);
  if (distance <= 2) return 50 + distance * 5;

  const strippedDistance = levenshteinDistance(
    queryWithoutOppositePrefix,
    nodeNameWithoutOppositePrefix,
  );
  if (strippedDistance <= 2) return 60 + strippedDistance * 5;

  return null;
}

function normalizeStopName(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, ' ');
}

function stripOppositeSidePrefix(value: string): string {
  return value
    .replace(/^(sbr\.?|seberang)\s+/i, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i++) {
    current[0] = i;

    for (let j = 1; j <= b.length; j++) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + substitutionCost,
      );
    }

    for (let j = 0; j <= b.length; j++) {
      previous[j] = current[j];
    }
  }

  return previous[b.length];
}

function getDistanceMeters(a: RoutingGraphNode, b: RoutingGraphNode): number {
  const earthRadiusMeters = 6371000;
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const deltaLat = toRadians(b.latitude - a.latitude);
  const deltaLon = toRadians(b.longitude - a.longitude);

  const haversine =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);

  return (
    earthRadiusMeters *
    2 *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function toCoordinateString(
  latitude?: number,
  longitude?: number,
): string | undefined {
  if (latitude == null || longitude == null) return undefined;
  return `${latitude},${longitude}`;
}

function scoreRouteOption(
  option: RouteOptionDto,
  candidateScore: number,
): number {
  return (
    option.totalDurationSeconds +
    option.transferCount * 900 +
    option.walkingDurationSeconds +
    candidateScore
  );
}

function sortOptionsByQuality(a: RouteOptionDto, b: RouteOptionDto): number {
  return (
    a.totalDurationSeconds - b.totalDurationSeconds ||
    a.transferCount - b.transferCount ||
    a.walkingDurationSeconds - b.walkingDurationSeconds
  );
}

function findClosestShapePointIndex(
  coordinates: number[][],
  targetLat: number,
  targetLng: number,
): number {
  if (coordinates.length === 0) return -1;

  let bestIndex = 0;
  let bestDistance = Infinity;

  for (let i = 0; i < coordinates.length; i++) {
    const [lng, lat] = coordinates[i];
    const distance = haversineDistanceMeters(lat, lng, targetLat, targetLng);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }

  return bestIndex;
}

function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const earthRadiusMeters = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2;
  const b = Math.sin(dLng / 2) ** 2;
  const h = a + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * b;
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
