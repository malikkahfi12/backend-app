export type TripEntity = {
  id: string;
  feedSourceId: string | null;
  externalTripId: string | null;
  routeId: string;
  serviceId: string;
  headsign: string;
  directionId: number | null;
  blockId: string | null;
  regionId: string;
  operatorId: string;
  externalShapeId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};
