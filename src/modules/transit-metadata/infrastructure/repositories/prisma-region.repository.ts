import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { RegionEntity } from '../../domain/entities/region.entity';
import {
  CreateRegionInput,
  RegionRepository,
} from '../../domain/repositories/region.repository.interface';

@Injectable()
export class PrismaRegionRepository implements RegionRepository {
  constructor(private readonly prismaService: PrismaService) {}

  create(input: CreateRegionInput): Promise<RegionEntity> {
    return this.prismaService.region.create({ data: input });
  }

  findAll(): Promise<RegionEntity[]> {
    return this.prismaService.region.findMany({
      orderBy: [{ countryId: 'asc' }, { code: 'asc' }],
    });
  }

  findById(id: string): Promise<RegionEntity | null> {
    return this.prismaService.region.findUnique({
      where: { id },
    });
  }
}
