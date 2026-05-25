import { CalendarEntity } from '../entities/calendar.entity';

export const CALENDAR_REPOSITORY = Symbol('CALENDAR_REPOSITORY');

export type CreateCalendarInput = {
  feedSourceId?: string | null;
  serviceId: string;
  monday?: boolean;
  tuesday?: boolean;
  wednesday?: boolean;
  thursday?: boolean;
  friday?: boolean;
  saturday?: boolean;
  sunday?: boolean;
  startDate: Date | string;
  endDate: Date | string;
  regionId?: string;
  operatorId?: string;
  isActive?: boolean;
};

export interface CalendarFilters {
  serviceId?: string;
  isActive?: boolean;
}

export interface CalendarRepository {
  create(input: CreateCalendarInput): Promise<CalendarEntity>;
  findAll(filters?: CalendarFilters): Promise<CalendarEntity[]>;
  findById(id: string): Promise<CalendarEntity | null>;
}
