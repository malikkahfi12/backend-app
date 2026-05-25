import { Injectable } from '@nestjs/common';
import { ParsedCalendarDate } from '../../types/gtfs-calendar-date.type';

@Injectable()
export class CalendarDateParser {
  parse(rawRows: Record<string, string>[]): {
    calendarDates: ParsedCalendarDate[];
    errors: string[];
  } {
    const calendarDates: ParsedCalendarDate[] = [];
    const errors: string[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const lineNumber = i + 2;

      if (!row.service_id) {
        errors.push(
          `calendar_dates.txt row ${lineNumber}: missing required field 'service_id'`,
        );
        continue;
      }
      if (!row.date) {
        errors.push(
          `calendar_dates.txt row ${lineNumber}: missing required field 'date'`,
        );
        continue;
      }
      const exType = parseInt(row.exception_type, 10);
      if (isNaN(exType) || (exType !== 1 && exType !== 2)) {
        errors.push(
          `calendar_dates.txt row ${lineNumber}: invalid exception_type '${row.exception_type}'`,
        );
        continue;
      }

      calendarDates.push({
        serviceId: row.service_id,
        date: row.date,
        exceptionType: exType,
      });
    }

    return { calendarDates, errors };
  }
}
