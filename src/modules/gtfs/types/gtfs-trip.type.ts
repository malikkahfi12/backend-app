export interface ParsedTrip {
  gtfsTripId: string;
  routeId: string;
  serviceId: string;
  shapeId?: string;
  headsign?: string;
  directionId?: number;
  blockId?: string;
}
