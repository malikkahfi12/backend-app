import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  CountryRepository,
  CreateCountryInput,
} from '../../domain/repositories/country.repository.interface';
import { CountryEntity } from '../../domain/entities/country.entity';

@Injectable()
export class PrismaCountryRepository implements CountryRepository {
  constructor(private readonly prismaService: PrismaService) {}

  create(input: CreateCountryInput): Promise<CountryEntity> {
    return this.prismaService.country.create({ data: input });
  }

  findAll(): Promise<CountryEntity[]> {
    return this.prismaService.country.findMany({
      orderBy: { code: 'asc' },
    });
  }

  findById(id: string): Promise<CountryEntity | null> {
    return this.prismaService.country.findUnique({
      where: { id },
    });
  }
}
