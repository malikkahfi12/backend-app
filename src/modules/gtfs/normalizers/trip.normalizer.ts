import { Injectable } from '@nestjs/common';
import { ParsedTrip } from '../types/gtfs-trip.type';

@Injectable()
export class TripNormalizer {
  normalize(trips: ParsedTrip[]): ParsedTrip[] {
    return trips.map((trip) => ({
      ...trip,
      headsign: trip.headsign || undefined,
    }));
  }
}
