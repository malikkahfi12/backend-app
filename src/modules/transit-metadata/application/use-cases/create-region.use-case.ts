import { Injectable } from '@nestjs/common';
import { RegionEntity } from '../../domain/entities/region.entity';
import { CreateRegionInput } from '../../domain/repositories/region.repository.interface';
import { RegionService } from '../services/region.service';

@Injectable()
export class CreateRegionUseCase {
  constructor(private readonly regionService: RegionService) {}

  execute(input: CreateRegionInput): Promise<RegionEntity> {
    return this.regionService.create(input);
  }
}
