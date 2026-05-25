import { Injectable } from '@nestjs/common';
import {
  REQUIRED_GTFS_FILES,
  GTFS_FILE_COLUMNS,
  GtfsFeed,
} from '../types/gtfs.types';

@Injectable()
export class GtfsValidatorService {
  validate(fileData: Map<string, Record<string, string>[]>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    for (const requiredFile of REQUIRED_GTFS_FILES) {
      if (!fileData.has(requiredFile)) {
        errors.push(`Missing required file: ${requiredFile}`);
      }
    }

    if (errors.length > 0) return { valid: false, errors };

    for (const [fileName, rows] of fileData) {
      const requiredCols = GTFS_FILE_COLUMNS[fileName];
      if (!requiredCols || rows.length === 0) continue;

      const firstRow = rows[0];
      for (const col of requiredCols) {
        if (!(col in firstRow)) {
          errors.push(`${fileName}: missing required column '${col}'`);
        }
      }
    }

    if (errors.length > 0) return { valid: false, errors };

    const stopTimes = fileData.get('stop_times.txt') || [];
    for (let i = 0; i < stopTimes.length; i++) {
      const row = stopTimes[i];
      const rowLabel = `stop_times.txt row ${i + 2}`;

      if (row.arrival_time && !this.isValidGtfsTime(row.arrival_time)) {
        errors.push(`${rowLabel}: invalid arrival_time '${row.arrival_time}'`);
      }
      if (row.departure_time && !this.isValidGtfsTime(row.departure_time)) {
        errors.push(
          `${rowLabel}: invalid departure_time '${row.departure_time}'`,
        );
      }
      const seq = parseInt(row.stop_sequence, 10);
      if (isNaN(seq) || seq < 0) {
        errors.push(
          `${rowLabel}: invalid stop_sequence '${row.stop_sequence}'`,
        );
      }
    }

    const stops = fileData.get('stops.txt') || [];
    for (let i = 0; i < stops.length; i++) {
      const row = stops[i];
      const rowLabel = `stops.txt row ${i + 2}`;
      const lat = parseFloat(row.stop_lat);
      const lon = parseFloat(row.stop_lon);

      if (isNaN(lat) || lat < -90 || lat > 90) {
        errors.push(`${rowLabel}: invalid stop_lat '${row.stop_lat}'`);
      }
      if (isNaN(lon) || lon < -180 || lon > 180) {
        errors.push(`${rowLabel}: invalid stop_lon '${row.stop_lon}'`);
      }
    }

    const calendars = fileData.get('calendar.txt') || [];
    for (let i = 0; i < calendars.length; i++) {
      const row = calendars[i];
      const rowLabel = `calendar.txt row ${i + 2}`;
      if (row.start_date && row.end_date && row.start_date > row.end_date) {
        errors.push(
          `${rowLabel}: start_date '${row.start_date}' after end_date '${row.end_date}'`,
        );
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private isValidGtfsTime(value: string): boolean {
    return /^\d{1,2}:[0-5]\d:[0-5]\d$/.test(value);
  }

  isEmpty(feed: GtfsFeed): boolean {
    return (
      feed.agencies.length === 0 &&
      feed.routes.length === 0 &&
      feed.stops.length === 0 &&
      feed.trips.length === 0 &&
      feed.stopTimes.length === 0 &&
      feed.calendars.length === 0
    );
  }
}
