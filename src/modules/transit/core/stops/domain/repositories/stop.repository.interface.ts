import { StopEntity } from '../entities/stop.entity';

export const STOP_REPOSITORY = Symbol('STOP_REPOSITORY');

export type CreateStopInput = {
  feedSourceId?: string | null;
  externalStopId?: string | null;
  regionId: string;
  code?: string;
  name: string;
  slug: string;
  latitude: number;
  longitude: number;
  address?: string;
  locationType?: number | null;
  isStation?: boolean;
  parentStationId?: string;
  isActive?: boolean;
  osmId?: string | null;
  osmType?: string | null;
  source?: string | null;
  mode?: string | null;
};

export interface StopFilters {
  regionId?: string;
  isActive?: boolean;
  isStation?: boolean;
  locationType?: number;
  q?: string;
}

export interface NearbyStopResult extends StopEntity {
  distance_meters: number;
}

export interface StopRepository {
  create(input: CreateStopInput): Promise<StopEntity>;
  findAll(filters?: StopFilters): Promise<StopEntity[]>;
  findById(id: string): Promise<StopEntity | null>;
  findNearby(
    lat: number,
    lng: number,
    radius?: number,
  ): Promise<NearbyStopResult[]>;
  upsertByOsm(input: CreateStopInput): Promise<StopEntity>;
}
