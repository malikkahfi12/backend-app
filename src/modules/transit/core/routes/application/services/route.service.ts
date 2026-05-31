import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../../infrastructure/database/prisma.service';
import { encodePolyline6 } from '../../../../../../common/utils/polyline6';
import type { RouteEntity } from '../../domain/entities/route.entity';
import {
  ROUTE_REPOSITORY,
  RouteFilters,
  CreateRouteInput,
  PaginationParams,
  PaginatedRoutes,
} from '../../domain/repositories/route.repository.interface';
import type { RouteRepository } from '../../domain/repositories/route.repository.interface';

const MIN_GOOD_SHAPE_POINTS = 3;

export interface RouteStopDto {
  stopId: string;
  name: string;
  sequence: number;
  lat: number;
  lng: number;
}

@Injectable()
export class RouteService {
  constructor(
    @Inject(ROUTE_REPOSITORY)
    private readonly routeRepository: RouteRepository,
    private readonly prismaService: PrismaService,
  ) {}

  create(input: CreateRouteInput): Promise<RouteEntity> {
    return this.routeRepository.create(input);
  }

  findAll(filters?: RouteFilters): Promise<RouteEntity[]> {
    return this.routeRepository.findAll(filters);
  }

  findAllPaginated(
    filters?: RouteFilters,
    pagination?: PaginationParams,
  ): Promise<PaginatedRoutes> {
    return this.routeRepository.findAllPaginated(filters, pagination);
  }

  findById(id: string): Promise<RouteEntity | null> {
    return this.routeRepository.findById(id);
  }

  async getRouteShape(
    routeId: string,
  ): Promise<string | null> {
    const db = this.prismaService as any;

    const trips = await db.trip.findMany({
      where: { routeId, isActive: true },
      select: { feedSourceId: true, externalShapeId: true },
      distinct: ['externalShapeId'],
      take: 10,
    });

    const first = trips?.find(
      (t: Record<string, unknown>) => t.externalShapeId,
    ) as Record<string, unknown> | undefined;

    if (first) {
      const points = await db.shape.findMany({
        where: {
          feedSourceId: first.feedSourceId,
          externalShapeId: first.externalShapeId,
        },
        orderBy: { shapePtSequence: 'asc' },
      });

      const coords = points.map((p: Record<string, unknown>) => [
        p.shapePtLon as number,
        p.shapePtLat as number,
      ]);

      if (coords.length >= MIN_GOOD_SHAPE_POINTS) {
        return encodePolyline6(coords);
      }
    }

    const osmGeometry = await this.loadOsmMatchedGeometry(routeId);
    if (osmGeometry) return osmGeometry;

    return null;
  }

  private async loadOsmMatchedGeometry(
    routeId: string,
  ): Promise<string | null> {
    const db = this.prismaService as any;

    const route = await db.route.findUnique({
      where: { id: routeId },
      select: { matchedOsmRouteId: true, geometrySource: true },
    });

    if (!route?.matchedOsmRouteId || route.geometrySource !== 'osm') {
      return null;
    }

    const rows = await db.$queryRawUnsafe(
      `SELECT ST_AsGeoJSON(geometry)::json AS geometry
       FROM gtfs_routes
       WHERE id = $1 AND geometry IS NOT NULL`,
      route.matchedOsmRouteId,
    );

    if (!rows || rows.length === 0) return null;

    const geom = rows[0]?.geometry as
      | { type: string; coordinates: number[][] }
      | undefined;
    if (!geom || geom.type !== 'LineString' || !geom.coordinates?.length) {
      return null;
    }

    return encodePolyline6(geom.coordinates);
  }

  async getRouteStops(routeId: string): Promise<{
    data: RouteStopDto[];
    meta: { count: number };
  }> {
    const db = this.prismaService as any;

    const trips = await db.trip.findMany({
      where: { routeId, isActive: true },
      orderBy: { createdAt: 'asc' },
      take: 1,
    });

    if (trips.length === 0) return { data: [], meta: { count: 0 } };

    const tripId = trips[0].id;

    const stopTimes = await db.stopTime.findMany({
      where: { tripId },
      orderBy: { stopSequence: 'asc' },
      include: { stop: true },
    });

    const seen = new Set<string>();
    const result: RouteStopDto[] = [];

    for (const st of stopTimes) {
      if (!st.stop || seen.has(st.stopId)) continue;
      seen.add(st.stopId);

      result.push({
        stopId: st.stopId,
        name: st.stop.name,
        sequence: st.stopSequence,
        lat: st.stop.latitude,
        lng: st.stop.longitude,
      });
    }

    return { data: result, meta: { count: result.length } };
  }
}
