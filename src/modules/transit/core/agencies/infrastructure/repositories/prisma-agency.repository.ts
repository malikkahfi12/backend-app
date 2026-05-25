import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../../infrastructure/database/prisma.service';
import {
  AgencyRepository,
  AgencyFilters,
  CreateAgencyInput,
} from '../../domain/repositories/agency.repository.interface';
import { AgencyEntity } from '../../domain/entities/agency.entity';

@Injectable()
export class PrismaAgencyRepository implements AgencyRepository {
  constructor(private readonly prismaService: PrismaService) {}

  create(input: CreateAgencyInput): Promise<AgencyEntity> {
    return this.prismaService.agency.create({
      data: input,
    });
  }

  async findAll(filters?: AgencyFilters): Promise<AgencyEntity[]> {
    const where: Record<string, unknown> = {};
    if (filters?.regionId) where.regionId = filters.regionId;
    if (filters?.operatorId) where.operatorId = filters.operatorId;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;

    return await this.prismaService.agency.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  findById(id: string): Promise<AgencyEntity | null> {
    return this.prismaService.agency.findUnique({
      where: { id },
    });
  }
}
