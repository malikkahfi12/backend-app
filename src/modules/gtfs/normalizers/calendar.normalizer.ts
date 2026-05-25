import { Injectable } from '@nestjs/common';
import { ParsedCalendar } from '../types/gtfs-calendar.type';

@Injectable()
export class CalendarNormalizer {
  normalize(calendars: ParsedCalendar[]): ParsedCalendar[] {
    return calendars;
  }
}
