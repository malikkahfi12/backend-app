import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { TransitModeEntity } from '../../domain/entities/transit-mode.entity';
import {
  CreateTransitModeInput,
  TransitModeRepository,
} from '../../domain/repositories/transit-mode.repository.interface';

@Injectable()
export class PrismaTransitModeRepository implements TransitModeRepository {
  constructor(private readonly prismaService: PrismaService) {}

  create(input: CreateTransitModeInput): Promise<TransitModeEntity> {
    return this.prismaService.transitMode.create({ data: input });
  }

  findAll(): Promise<TransitModeEntity[]> {
    return this.prismaService.transitMode.findMany({
      orderBy: { code: 'asc' },
    });
  }

  findById(id: string): Promise<TransitModeEntity | null> {
    return this.prismaService.transitMode.findUnique({
      where: { id },
    });
  }
}
