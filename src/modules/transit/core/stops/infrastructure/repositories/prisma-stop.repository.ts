import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../../infrastructure/database/prisma.service';
import {
  StopRepository,
  StopFilters,
  CreateStopInput,
  NearbyStopResult,
} from '../../domain/repositories/stop.repository.interface';
import { StopEntity } from '../../domain/entities/stop.entity';
import { Prisma } from '@prisma/client';

const DEFAULT_NEARBY_RADIUS = 500;

@Injectable()
export class PrismaStopRepository implements StopRepository {
  constructor(private readonly prismaService: PrismaService) {}

  create(input: CreateStopInput): Promise<StopEntity> {
    return this.prismaService.stop.create({
      data: input as any,
    });
  }

  upsertByOsm(input: CreateStopInput): Promise<StopEntity> {
    const { osmId, osmType, ...data } = input;
    return this.prismaService.stop.upsert({
      where: {
        osmId_osmType: {
          osmId: osmId!,
          osmType: osmType!,
        },
      },
      update: data as any,
      create: input as any,
    });
  }

  async findAll(filters?: StopFilters): Promise<StopEntity[]> {
    const where: Record<string, unknown> = {};
    if (filters?.regionId) where.regionId = filters.regionId;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;
    if (filters?.isStation !== undefined) where.isStation = filters.isStation;
    if (filters?.locationType !== undefined)
      where.locationType = filters.locationType;

    if (filters?.q) {
      where.OR = [
        { name: { contains: filters.q, mode: 'insensitive' } },
        { code: { contains: filters.q, mode: 'insensitive' } },
        { slug: { contains: filters.q, mode: 'insensitive' } },
      ];
    }

    return await this.prismaService.stop.findMany({
      where,
      orderBy: { name: 'asc' },
      take: filters?.q ? 20 : undefined,
    });
  }

  findById(id: string): Promise<StopEntity | null> {
    return this.prismaService.stop.findUnique({
      where: { id },
    });
  }

  async findNearby(
    lat: number,
    lng: number,
    radius = DEFAULT_NEARBY_RADIUS,
  ): Promise<NearbyStopResult[]> {
    return await this.prismaService.$queryRaw(
      Prisma.sql`
        SELECT
          id, feed_source_id, external_stop_id, region_id, code, name, slug,
          latitude, longitude, address, is_station, parent_station_id, is_active,
          created_at, updated_at,
          osm_id, osm_type, source, mode,
          ST_Distance(location, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography) AS distance_meters
        FROM gtfs_stops
        WHERE location IS NOT NULL
          AND is_active = true
          AND ST_DWithin(location, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${radius})
        ORDER BY distance_meters
        LIMIT 30
      `,
    );
  }
}
