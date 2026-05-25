export interface ParsedRoute {
  gtfsRouteId: string;
  shortName: string;
  longName: string;
  routeType: number;
  agencyId?: string;
  color?: string;
  textColor?: string;
  description?: string;
}
