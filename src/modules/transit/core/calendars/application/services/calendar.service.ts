import { Inject, Injectable } from '@nestjs/common';
import type { CalendarEntity } from '../../domain/entities/calendar.entity';
import {
  CALENDAR_REPOSITORY,
  CalendarFilters,
  CreateCalendarInput,
} from '../../domain/repositories/calendar.repository.interface';
import type { CalendarRepository } from '../../domain/repositories/calendar.repository.interface';

@Injectable()
export class CalendarService {
  constructor(
    @Inject(CALENDAR_REPOSITORY)
    private readonly calendarRepository: CalendarRepository,
  ) {}

  create(input: CreateCalendarInput): Promise<CalendarEntity> {
    return this.calendarRepository.create(input);
  }

  findAll(filters?: CalendarFilters): Promise<CalendarEntity[]> {
    return this.calendarRepository.findAll(filters);
  }

  findById(id: string): Promise<CalendarEntity | null> {
    return this.calendarRepository.findById(id);
  }
}
