import { Injectable } from '@nestjs/common';
import { ParsedCalendarDate } from '../types/gtfs-calendar-date.type';

@Injectable()
export class CalendarDateNormalizer {
  normalize(calendarDates: ParsedCalendarDate[]): ParsedCalendarDate[] {
    return calendarDates;
  }
}
