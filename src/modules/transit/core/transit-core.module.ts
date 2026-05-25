import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../infrastructure/database/database.module';
import { SchedulesModule } from '../../schedules/schedules.module';

import { AGENCY_REPOSITORY } from './agencies/domain/repositories/agency.repository.interface';
import { ROUTE_REPOSITORY } from './routes/domain/repositories/route.repository.interface';
import { STOP_REPOSITORY } from './stops/domain/repositories/stop.repository.interface';
import { TRIP_REPOSITORY } from './trips/domain/repositories/trip.repository.interface';
import { STOP_TIME_REPOSITORY } from './stop-times/domain/repositories/stop-time.repository.interface';
import { CALENDAR_REPOSITORY } from './calendars/domain/repositories/calendar.repository.interface';

import { PrismaAgencyRepository } from './agencies/infrastructure/repositories/prisma-agency.repository';
import { PrismaRouteRepository } from './routes/infrastructure/repositories/prisma-route.repository';
import { PrismaStopRepository } from './stops/infrastructure/repositories/prisma-stop.repository';
import { PrismaTripRepository } from './trips/infrastructure/repositories/prisma-trip.repository';
import { PrismaStopTimeRepository } from './stop-times/infrastructure/repositories/prisma-stop-time.repository';
import { PrismaCalendarRepository } from './calendars/infrastructure/repositories/prisma-calendar.repository';

import { AgencyService } from './agencies/application/services/agency.service';
import { RouteService } from './routes/application/services/route.service';
import { StopService } from './stops/application/services/stop.service';
import { TripService } from './trips/application/services/trip.service';
import { StopTimeService } from './stop-times/application/services/stop-time.service';
import { CalendarService } from './calendars/application/services/calendar.service';

import { AgenciesController } from './agencies/presentation/controllers/agencies.controller';
import { RoutesController } from './routes/presentation/controllers/routes.controller';
import { StopsController } from './stops/presentation/controllers/stops.controller';
import { TripsController } from './trips/presentation/controllers/trips.controller';
import { StopTimesController } from './stop-times/presentation/controllers/stop-times.controller';
import { CalendarsController } from './calendars/presentation/controllers/calendars.controller';

@Module({
  imports: [DatabaseModule, SchedulesModule],
  controllers: [
    AgenciesController,
    RoutesController,
    StopsController,
    TripsController,
    StopTimesController,
    CalendarsController,
  ],
  providers: [
    AgencyService,
    RouteService,
    StopService,
    TripService,
    StopTimeService,
    CalendarService,
    { provide: AGENCY_REPOSITORY, useClass: PrismaAgencyRepository },
    { provide: ROUTE_REPOSITORY, useClass: PrismaRouteRepository },
    { provide: STOP_REPOSITORY, useClass: PrismaStopRepository },
    { provide: TRIP_REPOSITORY, useClass: PrismaTripRepository },
    { provide: STOP_TIME_REPOSITORY, useClass: PrismaStopTimeRepository },
    { provide: CALENDAR_REPOSITORY, useClass: PrismaCalendarRepository },
  ],
  exports: [StopService],
})
export class TransitCoreModule {}
