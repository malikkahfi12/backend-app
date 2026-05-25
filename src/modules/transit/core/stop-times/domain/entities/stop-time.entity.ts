export type StopTimeEntity = {
  id: string;
  tripId: string;
  stopId: string;
  stopSequence: number;
  arrivalTime: string;
  departureTime: string;
  arrivalSeconds: number | null;
  departureSeconds: number | null;
  pickupType: number | null;
  dropOffType: number | null;
};
