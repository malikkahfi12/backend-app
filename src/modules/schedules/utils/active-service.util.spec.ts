import { isServiceActive } from './active-service.util';
import type { CalendarEntity } from '../../transit/core/calendars/domain/entities/calendar.entity';

describe('isServiceActive', () => {
  const makeCalendar = (overrides: Partial<Record<string, unknown>> = {}) =>
    ({
      id: 'cal-1',
      serviceId: 'svc-1',
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      regionId: 'region-1',
      operatorId: 'op-1',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      feedSourceId: null,
      ...overrides,
    }) as unknown as CalendarEntity & { id: string; serviceId: string };

  it('returns true for active weekday within date range', () => {
    // Monday Jan 5, 2026
    const date = new Date('2026-01-05T00:00:00.000Z');
    expect(isServiceActive('svc-1', date, [makeCalendar()], [])).toBe(true);
  });

  it('returns false for inactive weekday', () => {
    // Saturday Jan 10, 2026
    const date = new Date('2026-01-10T00:00:00.000Z');
    expect(isServiceActive('svc-1', date, [makeCalendar()], [])).toBe(false);
  });

  it('returns false when date is before startDate', () => {
    const date = new Date('2025-12-25T00:00:00.000Z');
    expect(isServiceActive('svc-1', date, [makeCalendar()], [])).toBe(false);
  });

  it('exception type 1 (add) overrides inactive day', () => {
    const date = new Date('2026-01-10T00:00:00.000Z'); // Saturday
    expect(
      isServiceActive(
        'svc-1',
        date,
        [makeCalendar()],
        [
          {
            serviceId: 'svc-1',
            date: new Date('2026-01-10'),
            exceptionType: 1,
          },
        ],
      ),
    ).toBe(true);
  });

  it('exception type 2 (remove) overrides active day', () => {
    const date = new Date('2026-01-05T00:00:00.000Z'); // Monday
    expect(
      isServiceActive(
        'svc-1',
        date,
        [makeCalendar()],
        [
          {
            serviceId: 'svc-1',
            date: new Date('2026-01-05'),
            exceptionType: 2,
          },
        ],
      ),
    ).toBe(false);
  });

  it('returns false when no calendar found', () => {
    const date = new Date('2026-01-05T00:00:00.000Z');
    expect(isServiceActive('svc-unknown', date, [], [])).toBe(false);
  });
});
