import { Injectable } from '@nestjs/common';
import { ParsedStop } from '../../types/gtfs-stop.type';

@Injectable()
export class StopsParser {
  parse(rawRows: Record<string, string>[]): {
    stops: ParsedStop[];
    errors: string[];
  } {
    const stops: ParsedStop[] = [];
    const errors: string[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const lineNumber = i + 2;

      if (!row.stop_id) {
        errors.push(
          `stops.txt row ${lineNumber}: missing required field 'stop_id'`,
        );
        continue;
      }
      if (!row.stop_name) {
        errors.push(
          `stops.txt row ${lineNumber}: missing required field 'stop_name'`,
        );
        continue;
      }

      const lat = parseFloat(row.stop_lat);
      const lng = parseFloat(row.stop_lon);

      if (isNaN(lat) || lat < -90 || lat > 90) {
        errors.push(
          `stops.txt row ${lineNumber}: invalid stop_lat '${row.stop_lat}'`,
        );
        continue;
      }
      if (isNaN(lng) || lng < -180 || lng > 180) {
        errors.push(
          `stops.txt row ${lineNumber}: invalid stop_lon '${row.stop_lon}'`,
        );
        continue;
      }

      const locationType = row.location_type
        ? parseInt(row.location_type, 10)
        : undefined;

      stops.push({
        gtfsStopId: row.stop_id,
        name: row.stop_name,
        lat,
        lng,
        code: row.stop_code || undefined,
        locationType,
        parentStation: row.parent_station || undefined,
        stopDesc: row.stop_desc || undefined,
        countryCode: '',
        regionCode: '',
      });
    }

    return { stops, errors };
  }
}
