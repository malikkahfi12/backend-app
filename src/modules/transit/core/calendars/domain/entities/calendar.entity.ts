export type CalendarEntity = {
  id: string;
  feedSourceId: string | null;
  serviceId: string;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
  startDate: Date;
  endDate: Date;
  regionId: string;
  operatorId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};
