import { ParsedAgency } from './gtfs-agency.type';
import { ParsedStop } from './gtfs-stop.type';
import { ParsedRoute } from './gtfs-route.type';

export interface GtfsParseResult {
  agencies: ParsedAgency[];
  stops: ParsedStop[];
  routes: ParsedRoute[];
}
