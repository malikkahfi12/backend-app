import { Injectable } from '@nestjs/common';
import { ParsedCalendar } from '../../types/gtfs-calendar.type';

@Injectable()
export class CalendarParser {
  parse(rawRows: Record<string, string>[]): {
    calendars: ParsedCalendar[];
    errors: string[];
  } {
    const calendars: ParsedCalendar[] = [];
    const errors: string[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const lineNumber = i + 2;

      if (!row.service_id) {
        errors.push(
          `calendar.txt row ${lineNumber}: missing required field 'service_id'`,
        );
        continue;
      }
      if (!row.start_date || !row.end_date) {
        errors.push(
          `calendar.txt row ${lineNumber}: missing start_date or end_date`,
        );
        continue;
      }
      if (row.start_date > row.end_date) {
        errors.push(
          `calendar.txt row ${lineNumber}: start_date '${row.start_date}' after end_date '${row.end_date}'`,
        );
        continue;
      }

      calendars.push({
        serviceId: row.service_id,
        monday: row.monday === '1',
        tuesday: row.tuesday === '1',
        wednesday: row.wednesday === '1',
        thursday: row.thursday === '1',
        friday: row.friday === '1',
        saturday: row.saturday === '1',
        sunday: row.sunday === '1',
        startDate: row.start_date,
        endDate: row.end_date,
      });
    }

    return { calendars, errors };
  }
}
