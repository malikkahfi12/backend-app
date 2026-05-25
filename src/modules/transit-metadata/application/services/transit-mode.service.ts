import { Inject, Injectable } from '@nestjs/common';
import type { TransitModeEntity } from '../../domain/entities/transit-mode.entity';
import { TRANSIT_MODE_REPOSITORY } from '../../domain/repositories/transit-mode.repository.interface';
import type {
  CreateTransitModeInput,
  TransitModeRepository,
} from '../../domain/repositories/transit-mode.repository.interface';

@Injectable()
export class TransitModeService {
  constructor(
    @Inject(TRANSIT_MODE_REPOSITORY)
    private readonly transitModeRepository: TransitModeRepository,
  ) {}

  create(input: CreateTransitModeInput): Promise<TransitModeEntity> {
    return this.transitModeRepository.create(input);
  }

  findAll(): Promise<TransitModeEntity[]> {
    return this.transitModeRepository.findAll();
  }
}
