import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../../infrastructure/database/prisma.service';
import {
  StopTimeRepository,
  StopTimeFilters,
  CreateStopTimeInput,
} from '../../domain/repositories/stop-time.repository.interface';
import { StopTimeEntity } from '../../domain/entities/stop-time.entity';

@Injectable()
export class PrismaStopTimeRepository implements StopTimeRepository {
  constructor(private readonly prismaService: PrismaService) {}

  create(input: CreateStopTimeInput): Promise<StopTimeEntity> {
    return this.prismaService.stopTime.create({
      data: input,
    });
  }

  async findAll(filters?: StopTimeFilters): Promise<StopTimeEntity[]> {
    const where: Record<string, unknown> = {};
    if (filters?.tripId) where.tripId = filters.tripId;
    if (filters?.stopId) where.stopId = filters.stopId;

    return await this.prismaService.stopTime.findMany({
      where,
      orderBy: { stopSequence: 'asc' },
    });
  }

  findById(id: string): Promise<StopTimeEntity | null> {
    return this.prismaService.stopTime.findUnique({
      where: { id },
    });
  }
}
