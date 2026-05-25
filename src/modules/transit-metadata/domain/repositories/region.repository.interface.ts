import { RegionEntity } from '../entities/region.entity';

export const REGION_REPOSITORY = Symbol('REGION_REPOSITORY');

export type CreateRegionInput = {
  countryId: string;
  code: string;
  name: string;
  timezone: string;
  defaultLocale: string;
};

export interface RegionRepository {
  create(input: CreateRegionInput): Promise<RegionEntity>;
  findAll(): Promise<RegionEntity[]>;
  findById(id: string): Promise<RegionEntity | null>;
}
