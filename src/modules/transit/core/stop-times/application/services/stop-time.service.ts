import { Inject, Injectable } from '@nestjs/common';
import type { StopTimeEntity } from '../../domain/entities/stop-time.entity';
import {
  STOP_TIME_REPOSITORY,
  StopTimeFilters,
  CreateStopTimeInput,
} from '../../domain/repositories/stop-time.repository.interface';
import type { StopTimeRepository } from '../../domain/repositories/stop-time.repository.interface';

@Injectable()
export class StopTimeService {
  constructor(
    @Inject(STOP_TIME_REPOSITORY)
    private readonly stopTimeRepository: StopTimeRepository,
  ) {}

  create(input: CreateStopTimeInput): Promise<StopTimeEntity> {
    return this.stopTimeRepository.create(input);
  }

  findAll(filters?: StopTimeFilters): Promise<StopTimeEntity[]> {
    return this.stopTimeRepository.findAll(filters);
  }

  findById(id: string): Promise<StopTimeEntity | null> {
    return this.stopTimeRepository.findById(id);
  }
}
