import { Inject, Injectable } from '@nestjs/common';
import type { RegionEntity } from '../../domain/entities/region.entity';
import { REGION_REPOSITORY } from '../../domain/repositories/region.repository.interface';
import type {
  CreateRegionInput,
  RegionRepository,
} from '../../domain/repositories/region.repository.interface';

@Injectable()
export class RegionService {
  constructor(
    @Inject(REGION_REPOSITORY)
    private readonly regionRepository: RegionRepository,
  ) {}

  create(input: CreateRegionInput): Promise<RegionEntity> {
    return this.regionRepository.create(input);
  }

  findAll(): Promise<RegionEntity[]> {
    return this.regionRepository.findAll();
  }
}
