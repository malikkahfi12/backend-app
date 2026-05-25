import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { OperatorEntity } from '../../domain/entities/operator.entity';
import {
  CreateOperatorInput,
  OperatorRepository,
} from '../../domain/repositories/operator.repository.interface';

@Injectable()
export class PrismaOperatorRepository implements OperatorRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async create(input: CreateOperatorInput): Promise<OperatorEntity> {
    const operator = await this.prismaService.operator.create({
      data: {
        ...input,
        websiteUrl: input.websiteUrl ?? null,
      },
    });

    return operator as OperatorEntity;
  }

  async findAll(): Promise<OperatorEntity[]> {
    const operators = await this.prismaService.operator.findMany({
      orderBy: [{ regionId: 'asc' }, { code: 'asc' }],
    });

    return operators as OperatorEntity[];
  }

  async findById(id: string): Promise<OperatorEntity | null> {
    const operator = await this.prismaService.operator.findUnique({
      where: { id },
    });

    return operator as OperatorEntity | null;
  }
}
