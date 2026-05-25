import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../../infrastructure/database/prisma.service';
import {
  TripRepository,
  TripFilters,
  CreateTripInput,
} from '../../domain/repositories/trip.repository.interface';
import { TripEntity } from '../../domain/entities/trip.entity';

@Injectable()
export class PrismaTripRepository implements TripRepository {
  constructor(private readonly prismaService: PrismaService) {}

  create(input: CreateTripInput): Promise<TripEntity> {
    return this.prismaService.trip.create({
      data: input as any,
    });
  }

  async findAll(filters?: TripFilters): Promise<TripEntity[]> {
    const where: Record<string, unknown> = {};
    if (filters?.routeId) where.routeId = filters.routeId;
    if (filters?.serviceId) where.serviceId = filters.serviceId;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;

    return await this.prismaService.trip.findMany({
      where,
      orderBy: { headsign: 'asc' },
    });
  }

  findById(id: string): Promise<TripEntity | null> {
    return this.prismaService.trip.findUnique({
      where: { id },
    });
  }
}
