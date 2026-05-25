import { RouteEntity } from '../entities/route.entity';

export const ROUTE_REPOSITORY = Symbol('ROUTE_REPOSITORY');

export type CreateRouteInput = {
  feedSourceId?: string | null;
  externalRouteId?: string | null;
  agencyId: string;
  transitModeId: string;
  shortName: string;
  longName: string;
  description?: string;
  color?: string;
  textColor?: string;
  isActive?: boolean;
  osmId?: string | null;
  osmType?: string | null;
  source?: string | null;
  regionId?: string | null;
  matchedOsmRouteId?: string | null;
  geometrySource?: string | null;
  geometryConfidenceScore?: number | null;
};

export type CreateRouteStopInput = {
  routeId: string;
  stopId: string;
  stopSequence: number;
};

export interface RouteFilters {
  agencyId?: string;
  transitModeId?: string;
  countryCode?: string;
  regionCode?: string;
  mode?: string;
  operatorId?: string;
  isActive?: boolean;
}

export interface PaginationParams {
  limit: number;
  page: number;
}

export interface PaginatedRoutes {
  data: RouteEntity[];
  meta: {
    count: number;
    limit: number;
    page: number;
  };
}

export interface RouteRepository {
  create(input: CreateRouteInput): Promise<RouteEntity>;
  findAll(filters?: RouteFilters): Promise<RouteEntity[]>;
  findAllPaginated(
    filters?: RouteFilters,
    pagination?: PaginationParams,
  ): Promise<PaginatedRoutes>;
  findById(id: string): Promise<RouteEntity | null>;
  upsertByOsm(input: CreateRouteInput): Promise<RouteEntity>;
  replaceRouteStops(
    routeId: string,
    stops: CreateRouteStopInput[],
  ): Promise<void>;
}
