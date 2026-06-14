import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { Prisma } from '@prisma/client';

export interface StopRow {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  parent_station_id: string | null;
}

export interface NearbyPairRow {
  from_stop_id: string;
  to_stop_id: string;
  distance_meters: number;
}

export interface TransitEdgeRow {
  trip_id: string;
  from_stop_id: string;
  to_stop_id: string;
  stop_sequence: number;
  departure_seconds: number | null;
  arrival_seconds: number | null;
  route_id: string;
  route_name: string | null;
  service_id: string;
}

@Injectable()
export class RoutingGraphRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findGraphStops(): Promise<StopRow[]> {
    return await this.prismaService.$queryRaw(
      Prisma.sql`
        SELECT id, name, latitude, longitude, parent_station_id
        FROM gtfs_stops
        WHERE is_active = true AND latitude IS NOT NULL AND longitude IS NOT NULL
      `,
    );
  }

  async findNearbyStopPairs(
    maxDistanceMeters: number,
  ): Promise<NearbyPairRow[]> {
    return await this.prismaService.$queryRaw(
      Prisma.sql`
        SELECT
          s1.id AS from_stop_id,
          s2.id AS to_stop_id,
          ST_Distance(s1.location, s2.location) AS distance_meters
        FROM gtfs_stops s1
        JOIN gtfs_stops s2 ON s1.id < s2.id
        WHERE ST_DWithin(s1.location, s2.location, ${maxDistanceMeters})
          AND s1.location IS NOT NULL
          AND s2.location IS NOT NULL
          AND s1.is_active = true
          AND s2.is_active = true
      `,
    );
  }

  async findTransitEdgeRows(): Promise<TransitEdgeRow[]> {
    return await this.prismaService.$queryRaw(
      Prisma.sql`
        SELECT
          st1.trip_id,
          st1.stop_id AS from_stop_id,
          st2.stop_id AS to_stop_id,
          st1.stop_sequence,
          st1.departure_seconds,
          st2.arrival_seconds,
          t.route_id,
          r.short_name AS route_name,
          t.service_id
        FROM gtfs_stop_times st1
        JOIN gtfs_stop_times st2
          ON st1.trip_id = st2.trip_id
          AND st2.stop_sequence = st1.stop_sequence + 1
        JOIN gtfs_trips t ON st1.trip_id = t.id
        JOIN gtfs_routes r ON r.id = t.route_id
        WHERE t.is_active = true
        ORDER BY st1.trip_id, st1.stop_sequence
      `,
    );
  }

  async findOsmTransitEdgeRows(): Promise<TransitEdgeRow[]> {
    return await this.prismaService.$queryRaw(
      Prisma.sql`
        SELECT
          r.id AS trip_id,
          rs1.stop_id AS from_stop_id,
          rs2.stop_id AS to_stop_id,
          rs1.stop_sequence,
          NULL::int AS departure_seconds,
          NULL::int AS arrival_seconds,
          r.id AS route_id,
          r.short_name AS route_name,
          'osm' AS service_id
        FROM gtfs_route_stops rs1
        JOIN gtfs_route_stops rs2
          ON rs1.route_id = rs2.route_id
          AND rs2.stop_sequence = rs1.stop_sequence + 1
        JOIN gtfs_routes r ON r.id = rs1.route_id
          AND r.source = 'osm'
          AND r.is_active = true
        ORDER BY r.id, rs1.stop_sequence
      `,
    );
  }
}
