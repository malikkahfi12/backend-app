import { TripEntity } from '../entities/trip.entity';

export const TRIP_REPOSITORY = Symbol('TRIP_REPOSITORY');

export type CreateTripInput = {
  feedSourceId?: string | null;
  externalTripId?: string | null;
  routeId: string;
  serviceId: string;
  headsign: string;
  directionId?: number;
  blockId?: string;
  regionId?: string;
  operatorId?: string;
  externalShapeId?: string | null;
  isActive?: boolean;
};

export interface TripFilters {
  routeId?: string;
  serviceId?: string;
  isActive?: boolean;
}

export interface TripRepository {
  create(input: CreateTripInput): Promise<TripEntity>;
  findAll(filters?: TripFilters): Promise<TripEntity[]>;
  findById(id: string): Promise<TripEntity | null>;
}
