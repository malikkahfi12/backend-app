import { Injectable } from '@nestjs/common';
import { ParsedTrip } from '../../types/gtfs-trip.type';

@Injectable()
export class TripParser {
  parse(rawRows: Record<string, string>[]): {
    trips: ParsedTrip[];
    errors: string[];
  } {
    const trips: ParsedTrip[] = [];
    const errors: string[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const lineNumber = i + 2;

      if (!row.route_id) {
        errors.push(
          `trips.txt row ${lineNumber}: missing required field 'route_id'`,
        );
        continue;
      }
      if (!row.service_id) {
        errors.push(
          `trips.txt row ${lineNumber}: missing required field 'service_id'`,
        );
        continue;
      }
      if (!row.trip_id) {
        errors.push(
          `trips.txt row ${lineNumber}: missing required field 'trip_id'`,
        );
        continue;
      }

      trips.push({
        gtfsTripId: row.trip_id,
        routeId: row.route_id,
        serviceId: row.service_id,
        shapeId: row.shape_id || undefined,
        headsign: row.trip_headsign || undefined,
        directionId: row.direction_id
          ? parseInt(row.direction_id, 10)
          : undefined,
        blockId: row.block_id || undefined,
      });
    }

    return { trips, errors };
  }
}
