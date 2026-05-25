export interface ParsedStopTime {
  tripId: string;
  stopId: string;
  stopSequence: number;
  arrivalTime: string;
  departureTime: string;
  pickupType?: number;
  dropOffType?: number;
}
