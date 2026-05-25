import type { CalendarEntity } from '../../transit/core/calendars/domain/entities/calendar.entity';

export function isServiceActive(
  serviceId: string,
  date: Date,
  calendars: Array<CalendarEntity & { id: string; serviceId: string }>,
  calendarDates: Array<{
    serviceId: string;
    date: Date;
    exceptionType: number;
  }>,
): boolean {
  const dayNames: Array<keyof CalendarEntity> = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  const targetDay = dayNames[date.getUTCDay()];

  let active = false;

  const calendar = calendars.find((c) => c.serviceId === serviceId);
  if (calendar) {
    const startDate = new Date(calendar.startDate);
    const endDate = new Date(calendar.endDate);
    if (date >= startDate && date <= endDate) {
      if ((calendar as Record<string, unknown>)[targetDay]) {
        active = true;
      }
    }
  }

  const dateStr =
    date instanceof Date
      ? date.toISOString().slice(0, 10)
      : String(date).slice(0, 10);
  const exception = calendarDates.find((cd) => {
    const cdDateStr =
      cd.date instanceof Date
        ? cd.date.toISOString().slice(0, 10)
        : String(cd.date).slice(0, 10);
    return cd.serviceId === serviceId && cdDateStr === dateStr;
  });
  if (exception) {
    if (exception.exceptionType === 1) active = true;
    if (exception.exceptionType === 2) active = false;
  }

  return active;
}
