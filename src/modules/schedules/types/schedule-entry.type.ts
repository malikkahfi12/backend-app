export interface ScheduleEntry {
  tripId: string;
  stopId: string;
  stopName: string;
  stopSequence: number;
  arrivalTime: string;
  departureTime: string;
  arrivalSeconds: number | null;
  departureSeconds: number | null;
  headsign: string;
  routeName: string;
  mode: string;
}
