import { Injectable } from '@nestjs/common';

export const GTFS_ROUTE_TYPE_MAP: Record<number, string> = {
  0: 'LRT',
  1: 'MRT',
  2: 'KRL',
  3: 'BRT',
  4: 'FERRY',
  5: 'CABLE_TRAM',
  6: 'AERIAL_LIFT',
  7: 'FUNICULAR',
  11: 'TROLLEYBUS',
  12: 'MONORAIL',
};

@Injectable()
export class GtfsRouteTypeMapper {
  map(routeType: number): { code: string; warning?: string } {
    const code = GTFS_ROUTE_TYPE_MAP[routeType];
    if (code) return { code };

    return {
      code: 'UNKNOWN',
      warning: `Unknown GTFS route_type '${routeType}' mapped to UNKNOWN`,
    };
  }
}
