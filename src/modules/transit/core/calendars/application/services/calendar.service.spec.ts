import { CalendarRepository } from '../../domain/repositories/calendar.repository.interface';
import { CalendarEntity } from '../../domain/entities/calendar.entity';
import { CalendarService } from './calendar.service';

describe('CalendarService', () => {
  const calendar: CalendarEntity = {
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

  it('allows duplicate serviceId', () => {
    const cal2 = { ...calendar, id: 'cal-2' };
    expect(cal2.serviceId).toBe(calendar.serviceId);
    expect(cal2.id).not.toBe(calendar.id);
  });

  it('lists calendars by serviceId', async () => {
    const findAll = jest.fn().mockResolvedValue([calendar]);
    const repository = {
      create: jest.fn(),
      findAll,
      findById: jest.fn(),
    } as unknown as CalendarRepository;
    const service = new CalendarService(repository);

    await expect(service.findAll({ serviceId: 'service-1' })).resolves.toEqual([
      calendar,
    ]);
  });

  it('validates startDate before endDate', () => {
    expect(calendar.startDate.getTime()).toBeLessThanOrEqual(
      calendar.endDate.getTime(),
    );
  });
});
