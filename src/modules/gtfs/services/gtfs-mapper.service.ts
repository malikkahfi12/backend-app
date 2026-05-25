import { Injectable } from '@nestjs/common';
import {
  GtfsAgency,
  GtfsRoute,
  GtfsStop,
  GtfsTrip,
  GtfsStopTime,
  GtfsCalendar,
} from '../types/gtfs.types';
import { parseGtfsTimeToSeconds } from '../utils/gtfs-time.util';
import type { CreateAgencyInput } from '../../transit/core/agencies/domain/repositories/agency.repository.interface';
import type { CreateRouteInput } from '../../transit/core/routes/domain/repositories/route.repository.interface';
import type { CreateStopInput } from '../../transit/core/stops/domain/repositories/stop.repository.interface';
import type { CreateTripInput } from '../../transit/core/trips/domain/repositories/trip.repository.interface';
import type { CreateStopTimeInput } from '../../transit/core/stop-times/domain/repositories/stop-time.repository.interface';
import type { CreateCalendarInput } from '../../transit/core/calendars/domain/repositories/calendar.repository.interface';

export const GTFS_ROUTE_TYPE_TO_TRANSIT_MODE: Record<number, string> = {
  0: 'TRAM',
  1: 'SUBWAY',
  2: 'RAIL',
  3: 'BUS',
  4: 'FERRY',
  5: 'CABLE_TRAM',
  6: 'AERIAL_LIFT',
  7: 'FUNICULAR',
  11: 'TROLLEYBUS',
  12: 'MONORAIL',
};

@Injectable()
export class GtfsMapperService {
  mapAgency(
    gtfsAgency: GtfsAgency,
    feedSourceId: string,
    regionId: string,
    operatorId: string,
  ): CreateAgencyInput {
    return {
      feedSourceId,
      externalAgencyId: gtfsAgency.agency_id || undefined,
      regionId,
      operatorId,
      name: gtfsAgency.agency_name,
      slug: this.slugify(gtfsAgency.agency_name),
      timezone: gtfsAgency.agency_timezone,
      language: gtfsAgency.agency_lang || undefined,
      phone: gtfsAgency.agency_phone || undefined,
      website: gtfsAgency.agency_url || undefined,
      isActive: true,
    };
  }

  mapRoute(
    gtfsRoute: GtfsRoute,
    feedSourceId: string,
    agencyId: string,
    transitModeId: string,
  ): CreateRouteInput {
    return {
      feedSourceId,
      externalRouteId: gtfsRoute.route_id,
      agencyId,
      transitModeId,
      shortName: gtfsRoute.route_short_name,
      longName: gtfsRoute.route_long_name,
      description: gtfsRoute.route_desc || undefined,
      color: gtfsRoute.route_color || undefined,
      textColor: gtfsRoute.route_text_color || undefined,
      isActive: true,
    };
  }

  mapStop(
    gtfsStop: GtfsStop,
    feedSourceId: string,
    regionId: string,
  ): CreateStopInput {
    return {
      feedSourceId,
      externalStopId: gtfsStop.stop_id,
      regionId,
      code: gtfsStop.stop_code || undefined,
      name: gtfsStop.stop_name,
      slug: this.slugify(gtfsStop.stop_name),
      latitude: gtfsStop.stop_lat,
      longitude: gtfsStop.stop_lon,
      address: gtfsStop.stop_desc || undefined,
      locationType: gtfsStop.location_type ?? null,
      isStation: gtfsStop.location_type === 1,
      isActive: true,
    };
  }

  mapTrip(
    gtfsTrip: GtfsTrip,
    feedSourceId: string,
    routeId: string,
  ): CreateTripInput {
    return {
      feedSourceId,
      externalTripId: gtfsTrip.trip_id,
      routeId,
      serviceId: gtfsTrip.service_id,
      headsign: gtfsTrip.trip_headsign || '',
      directionId: gtfsTrip.direction_id
        ? parseInt(gtfsTrip.direction_id, 10)
        : undefined,
      blockId: gtfsTrip.block_id || undefined,
      externalShapeId: gtfsTrip.shape_id || null,
      isActive: true,
    };
  }

  mapStopTime(
    gtfsStopTime: GtfsStopTime,
    tripId: string,
    stopId: string,
  ): CreateStopTimeInput {
    return {
      tripId,
      stopId,
      stopSequence: gtfsStopTime.stop_sequence,
      arrivalTime: gtfsStopTime.arrival_time,
      departureTime: gtfsStopTime.departure_time,
      arrivalSeconds: gtfsStopTime.arrival_time
        ? parseGtfsTimeToSeconds(gtfsStopTime.arrival_time)
        : null,
      departureSeconds: gtfsStopTime.departure_time
        ? parseGtfsTimeToSeconds(gtfsStopTime.departure_time)
        : null,
      pickupType: gtfsStopTime.pickup_type
        ? parseInt(gtfsStopTime.pickup_type, 10)
        : undefined,
      dropOffType: gtfsStopTime.drop_off_type
        ? parseInt(gtfsStopTime.drop_off_type, 10)
        : undefined,
    };
  }

  mapCalendar(
    gtfsCalendar: GtfsCalendar,
    feedSourceId: string,
  ): CreateCalendarInput {
    return {
      feedSourceId,
      serviceId: gtfsCalendar.service_id,
      monday: gtfsCalendar.monday === '1',
      tuesday: gtfsCalendar.tuesday === '1',
      wednesday: gtfsCalendar.wednesday === '1',
      thursday: gtfsCalendar.thursday === '1',
      friday: gtfsCalendar.friday === '1',
      saturday: gtfsCalendar.saturday === '1',
      sunday: gtfsCalendar.sunday === '1',
      startDate: this.gtfsDateToDate(gtfsCalendar.start_date),
      endDate: this.gtfsDateToDate(gtfsCalendar.end_date),
      isActive: true,
    };
  }

  resolveTransitModeCode(routeType: number): string | undefined {
    return GTFS_ROUTE_TYPE_TO_TRANSIT_MODE[routeType];
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private gtfsDateToDate(dateStr: string): Date {
    if (dateStr.length === 8) {
      const y = dateStr.slice(0, 4);
      const m = dateStr.slice(4, 6);
      const d = dateStr.slice(6, 8);
      return new Date(`${y}-${m}-${d}T00:00:00.000Z`);
    }
    return new Date(dateStr);
  }
}
