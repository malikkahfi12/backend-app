import { toCalendarResponse } from '../mappers/calendar.mapper';
import { CalendarEntity } from '../../domain/entities/calendar.entity';

describe('toCalendarResponse', () => {
  it('maps entity to response DTO with date strings', () => {
    const entity: CalendarEntity = {
      id: 'cal-1',
      serviceId: 'service-1',
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      isActive: true,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    };

    const dto = toCalendarResponse(entity);
    expect(dto.startDate).toBe('2026-01-01');
    expect(dto.endDate).toBe('2026-12-31');
    expect(dto.monday).toBe(true);
    expect(dto.sunday).toBe(false);
    expect((dto as Record<string, unknown>).createdAt).toBeUndefined();
  });
});
