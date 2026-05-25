import { Injectable } from '@nestjs/common';
import { ParsedStopTime } from '../../types/gtfs-stop-time.type';

@Injectable()
export class StopTimeParser {
  parse(rawRows: Record<string, string>[]): {
    stopTimes: ParsedStopTime[];
    errors: string[];
  } {
    const stopTimes: ParsedStopTime[] = [];
    const errors: string[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const lineNumber = i + 2;

      if (!row.trip_id) {
        errors.push(
          `stop_times.txt row ${lineNumber}: missing required field 'trip_id'`,
        );
        continue;
      }
      if (!row.stop_id) {
        errors.push(
          `stop_times.txt row ${lineNumber}: missing required field 'stop_id'`,
        );
        continue;
      }
      const seq = parseInt(row.stop_sequence, 10);
      if (isNaN(seq) || seq < 0) {
        errors.push(
          `stop_times.txt row ${lineNumber}: invalid stop_sequence '${row.stop_sequence}'`,
        );
        continue;
      }

      const at = row.arrival_time;
      const dt = row.departure_time;
      if (at && !/^\d{1,2}:[0-5]\d:[0-5]\d$/.test(at)) {
        errors.push(
          `stop_times.txt row ${lineNumber}: invalid arrival_time '${at}'`,
        );
        continue;
      }
      if (dt && !/^\d{1,2}:[0-5]\d:[0-5]\d$/.test(dt)) {
        errors.push(
          `stop_times.txt row ${lineNumber}: invalid departure_time '${dt}'`,
        );
        continue;
      }

      stopTimes.push({
        tripId: row.trip_id,
        stopId: row.stop_id,
        stopSequence: seq,
        arrivalTime: at || '',
        departureTime: dt || '',
        pickupType: row.pickup_type ? parseInt(row.pickup_type, 10) : undefined,
        dropOffType: row.drop_off_type
          ? parseInt(row.drop_off_type, 10)
          : undefined,
      });
    }

    return { stopTimes, errors };
  }
}
