import { Inject, Injectable } from '@nestjs/common';
import type { AgencyEntity } from '../../domain/entities/agency.entity';
import {
  AGENCY_REPOSITORY,
  AgencyFilters,
  CreateAgencyInput,
} from '../../domain/repositories/agency.repository.interface';
import type { AgencyRepository } from '../../domain/repositories/agency.repository.interface';

@Injectable()
export class AgencyService {
  constructor(
    @Inject(AGENCY_REPOSITORY)
    private readonly agencyRepository: AgencyRepository,
  ) {}

  create(input: CreateAgencyInput): Promise<AgencyEntity> {
    return this.agencyRepository.create(input);
  }

  findAll(filters?: AgencyFilters): Promise<AgencyEntity[]> {
    return this.agencyRepository.findAll(filters);
  }

  findById(id: string): Promise<AgencyEntity | null> {
    return this.agencyRepository.findById(id);
  }
}
