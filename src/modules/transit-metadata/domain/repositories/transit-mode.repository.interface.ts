import { TransitModeEntity } from '../entities/transit-mode.entity';

export const TRANSIT_MODE_REPOSITORY = Symbol('TRANSIT_MODE_REPOSITORY');

export type CreateTransitModeInput = {
  code: string;
  name: string;
};

export interface TransitModeRepository {
  create(input: CreateTransitModeInput): Promise<TransitModeEntity>;
  findAll(): Promise<TransitModeEntity[]>;
  findById(id: string): Promise<TransitModeEntity | null>;
}
