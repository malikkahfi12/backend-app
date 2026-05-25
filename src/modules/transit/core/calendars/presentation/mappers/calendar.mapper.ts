import { CalendarEntity } from '../../domain/entities/calendar.entity';
import { CalendarResponseDto } from '../dto/calendar-response.dto';

export function toCalendarResponse(
  entity: CalendarEntity,
): CalendarResponseDto {
  return {
    id: entity.id,
    feedSourceId: entity.feedSourceId,
    serviceId: entity.serviceId,
    monday: entity.monday,
    tuesday: entity.tuesday,
    wednesday: entity.wednesday,
    thursday: entity.thursday,
    friday: entity.friday,
    saturday: entity.saturday,
    sunday: entity.sunday,
    startDate:
      entity.startDate instanceof Date
        ? entity.startDate.toISOString().slice(0, 10)
        : entity.startDate,
    endDate:
      entity.endDate instanceof Date
        ? entity.endDate.toISOString().slice(0, 10)
        : entity.endDate,
    isActive: entity.isActive,
  };
}
