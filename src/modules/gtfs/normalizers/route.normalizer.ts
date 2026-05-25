import { Injectable } from '@nestjs/common';
import { ParsedRoute } from '../types/gtfs-route.type';

@Injectable()
export class RouteNormalizer {
  normalize(routes: ParsedRoute[]): ParsedRoute[] {
    return routes;
  }
}
