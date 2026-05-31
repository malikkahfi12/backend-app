import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../../infrastructure/database/prisma.service';
import { encodePolyline6 } from '../../../../../../common/utils/polyline6';
import type { TripEntity } from '../../domain/entities/trip.entity';
import {
  TRIP_REPOSITORY,
  TripFilters,
  CreateTripInput,
} from '../../domain/repositories/trip.repository.interface';
import type { TripRepository } from '../../domain/repositories/trip.repository.interface';
import { TripStopDto } from '../../presentation/dto/trip-stop.dto';

@Injectable()
export class TripService {
  constructor(
    @Inject(TRIP_REPOSITORY)
    private readonly tripRepository: TripRepository,
    private readonly prismaService: PrismaService,
  ) {}

  create(input: CreateTripInput): Promise<TripEntity> {
    return this.tripRepository.create(input);
  }

  findAll(filters?: TripFilters): Promise<TripEntity[]> {
    return this.tripRepository.findAll(filters);
  }

  findById(id: string): Promise<TripEntity | null> {
    return this.tripRepository.findById(id);
  }

  async getTripShape(
    tripId: string,
  ): Promise<string | null> {
    const db = this.prismaService as any;

    const trip = await db.trip.findUnique({
      where: { id: tripId },
      select: { feedSourceId: true, externalShapeId: true },
    });

    if (!trip || !trip.externalShapeId) return null;

    const points = await db.shape.findMany({
      where: {
        feedSourceId: trip.feedSourceId,
        externalShapeId: trip.externalShapeId,
      },
      orderBy: { shapePtSequence: 'asc' },
    });

    if (!points || points.length === 0) return null;

    return encodePolyline6(
      points.map((p: Record<string, unknown>) => [
        p.shapePtLon as number,
        p.shapePtLat as number,
      ]),
    );
  }

  async getTripStops(tripId: string): Promise<TripStopDto[]> {
    const db = this.prismaService as any;

    const stopTimes = await db.stopTime.findMany({
      where: { tripId },
      orderBy: { stopSequence: 'asc' },
      include: { stop: true },
    });

    if (!stopTimes || stopTimes.length === 0) return [];

    const result: TripStopDto[] = [];
    for (const st of stopTimes) {
      const row = st as Record<string, unknown>;
      const stop = row.stop as Record<string, unknown> | null;
      result.push({
        stopId: row.stopId as string,
        stopName: (stop?.name as string) ?? '',
        stopSequence: row.stopSequence as number,
        latitude: (stop?.latitude as number) ?? 0,
        longitude: (stop?.longitude as number) ?? 0,
        arrivalTime: (row.arrivalTime as string) ?? '',
        departureTime: (row.departureTime as string) ?? '',
      });
    }
    return result;
  }
}
