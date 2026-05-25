import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../../infrastructure/database/prisma.service';
import type { StopEntity } from '../../domain/entities/stop.entity';
import {
  STOP_REPOSITORY,
  StopFilters,
  CreateStopInput,
  NearbyStopResult,
} from '../../domain/repositories/stop.repository.interface';
import type { StopRepository } from '../../domain/repositories/stop.repository.interface';

export interface StopRouteInfo {
  routeId: string;
  routeName: string;
  mode: string;
  headsign: string;
}

@Injectable()
export class StopService {
  constructor(
    @Inject(STOP_REPOSITORY)
    private readonly stopRepository: StopRepository,
    private readonly prismaService: PrismaService,
  ) {}

  create(input: CreateStopInput): Promise<StopEntity> {
    return this.stopRepository.create(input);
  }

  findAll(filters?: StopFilters): Promise<StopEntity[]> {
    return this.stopRepository.findAll(filters);
  }

  findById(id: string): Promise<StopEntity | null> {
    return this.stopRepository.findById(id);
  }

  findNearby(
    lat: number,
    lng: number,
    radius?: number,
  ): Promise<NearbyStopResult[]> {
    return this.stopRepository.findNearby(lat, lng, radius);
  }

  private modeMap: Map<string, string> | null = null;

  private async getModeMap(): Promise<Map<string, string>> {
    if (this.modeMap) return this.modeMap;
    const db = this.prismaService as any;
    const modes = await db.transitMode.findMany();
    this.modeMap = new Map<string, string>();
    for (const m of modes) {
      this.modeMap.set(m.id, m.code);
    }
    return this.modeMap;
  }

  async getStopRoutes(stopId: string): Promise<StopRouteInfo[]> {
    const db = this.prismaService as any;

    const rows = await db.stopTime.findMany({
      where: { stopId },
      include: {
        trip: {
          include: { route: true },
        },
      },
      distinct: ['tripId'],
      take: 100,
    });

    if (!rows || rows.length === 0) return [];

    const modeMap = await this.getModeMap();

    const seen = new Set<string>();
    const result: StopRouteInfo[] = [];

    for (const row of rows) {
      const trip = row.trip as Record<string, unknown> | undefined;
      if (!trip) continue;
      const route = trip.route as Record<string, unknown> | undefined;
      if (!route) continue;

      const key = route.id as string;
      if (seen.has(key)) continue;
      seen.add(key);

      result.push({
        routeId: route.id as string,
        routeName:
          (route.longName as string) || (route.shortName as string) || '',
        mode: (modeMap.get(route.transitModeId as string) as string) || '',
        headsign: (trip.headsign as string) || '',
      });
    }

    return result;
  }
}
