import { AgencyEntity } from '../entities/agency.entity';

export const AGENCY_REPOSITORY = Symbol('AGENCY_REPOSITORY');

export type CreateAgencyInput = {
  feedSourceId?: string | null;
  externalAgencyId?: string | null;
  regionId: string;
  operatorId: string;
  name: string;
  slug: string;
  timezone: string;
  language?: string;
  phone?: string;
  website?: string;
  isActive?: boolean;
};

export interface AgencyFilters {
  regionId?: string;
  operatorId?: string;
  isActive?: boolean;
}

export interface AgencyRepository {
  create(input: CreateAgencyInput): Promise<AgencyEntity>;
  findAll(filters?: AgencyFilters): Promise<AgencyEntity[]>;
  findById(id: string): Promise<AgencyEntity | null>;
}
