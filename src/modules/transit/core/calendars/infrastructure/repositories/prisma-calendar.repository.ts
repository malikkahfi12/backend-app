import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../../infrastructure/database/prisma.service';
import {
  CalendarRepository,
  CalendarFilters,
  CreateCalendarInput,
} from '../../domain/repositories/calendar.repository.interface';
import { CalendarEntity } from '../../domain/entities/calendar.entity';

@Injectable()
export class PrismaCalendarRepository implements CalendarRepository {
  constructor(private readonly prismaService: PrismaService) {}

  create(input: CreateCalendarInput): Promise<CalendarEntity> {
    return this.prismaService.calendar.create({
      data: {
        ...input,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
      } as any,
    });
  }

  async findAll(filters?: CalendarFilters): Promise<CalendarEntity[]> {
    const where: Record<string, unknown> = {};
    if (filters?.serviceId) where.serviceId = filters.serviceId;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;

    return await this.prismaService.calendar.findMany({
      where,
      orderBy: { startDate: 'asc' },
    });
  }

  findById(id: string): Promise<CalendarEntity | null> {
    return this.prismaService.calendar.findUnique({
      where: { id },
    });
  }
}
