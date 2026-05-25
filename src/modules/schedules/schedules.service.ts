import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { isServiceActive } from './utils/active-service.util';
import { parseGtfsTimeToSeconds } from '../gtfs/utils/gtfs-time.util';
import { DepartureResponseDto } from './dto/departure-response.dto';
import type { ScheduleEntry } from './types/schedule-entry.type';

@Injectable()
export class SchedulesService {
  private modeMap: Map<string, string> | null = null;

  constructor(private readonly prismaService: PrismaService) {}

  private async getModeMap(): Promise<Map<string, string>> {
    if (this.modeMap) return this.modeMap;

    const db = this.prismaService as any;
    const modes = await db.transitMode.findMany();
    this.modeMap = new Map<string, string>();
    for (const m of modes) {
      this.modeMap.set(m.id, m.code);
    }
    return this.modeMap;
  }

  async getDepartures(
    stopId: string,
    currentTime?: string,
    limit = 5,
    routeId?: string,
  ): Promise<{ data: DepartureResponseDto[]; meta: { count: number } }> {
    const db = this.prismaService as any;

    const where: Record<string, unknown> = { stopId };
    if (routeId) {
      where.trip = { routeId };
    }

    const raw = await db.stopTime.findMany({
      where,
      include: {
        trip: { include: { route: true } },
        stop: true,
      },
      orderBy: { departureSeconds: 'asc' },
      take: 500,
    });

    if (!raw || raw.length === 0) return { data: [], meta: { count: 0 } };

    const serviceIds = [
      ...new Set(
        raw
          .map(
            (st: Record<string, unknown>) =>
              (st.trip as Record<string, unknown>)?.serviceId as string,
          )
          .filter(Boolean),
      ),
    ];

    const today = new Date();
    const calendars = await db.calendar.findMany({
      where: { serviceId: { in: serviceIds } },
    });
    const calendarDates = await db.calendarDate.findMany({
      where: { serviceId: { in: serviceIds } },
    });

    const currentSeconds = currentTime
      ? (parseGtfsTimeToSeconds(currentTime) ?? 0)
      : 0;

    const modeMap = await this.getModeMap();

    const result = this.buildDepartures(
      raw,
      currentSeconds,
      limit,
      today,
      calendars,
      calendarDates,
      modeMap,
    );

    return { data: result, meta: { count: result.length } };
  }

  async getBatchDepartures(
    stops: string[],
    currentTime?: string,
    limit = 5,
  ): Promise<Record<string, DepartureResponseDto[]>> {
    if (stops.length === 0) return {};

    const db = this.prismaService as any;

    const raw = await db.stopTime.findMany({
      where: { stopId: { in: stops } },
      include: {
        trip: { include: { route: true } },
        stop: true,
      },
      orderBy: { departureSeconds: 'asc' },
      take: 500 * stops.length,
    });

    if (!raw || raw.length === 0) {
      const empty: Record<string, DepartureResponseDto[]> = {};
      for (const stopId of stops) empty[stopId] = [];
      return empty;
    }

    const serviceIds = [
      ...new Set(
        raw
          .map(
            (st: Record<string, unknown>) =>
              (st.trip as Record<string, unknown>)?.serviceId as string,
          )
          .filter(Boolean),
      ),
    ];

    const today = new Date();
    const calendars = await db.calendar.findMany({
      where: { serviceId: { in: serviceIds } },
    });
    const calendarDates = await db.calendarDate.findMany({
      where: { serviceId: { in: serviceIds } },
    });

    const currentSeconds = currentTime
      ? (parseGtfsTimeToSeconds(currentTime) ?? 0)
      : 0;

    const modeMap = await this.getModeMap();

    const grouped = new Map<string, Record<string, unknown>[]>();
    for (const st of raw) {
      const sid = (st as Record<string, unknown>).stopId as string;
      if (!grouped.has(sid)) grouped.set(sid, []);
      grouped.get(sid)!.push(st as Record<string, unknown>);
    }

    const result: Record<string, DepartureResponseDto[]> = {};
    for (const stopId of stops) {
      const rows = grouped.get(stopId) ?? [];
      result[stopId] = this.buildDepartures(
        rows,
        currentSeconds,
        limit,
        today,
        calendars,
        calendarDates,
        modeMap,
      );
    }

    return result;
  }

  async getSchedules(
    stopId: string,
    dateStr?: string,
    limit = 10,
  ): Promise<{ data: ScheduleEntry[]; meta: { count: number } }> {
    const db = this.prismaService as any;

    const raw = await db.stopTime.findMany({
      where: { stopId },
      include: {
        trip: { include: { route: true } },
        stop: true,
      },
      orderBy: { departureSeconds: 'asc' },
      take: 1000,
    });

    if (!raw || raw.length === 0) return { data: [], meta: { count: 0 } };

    const serviceIds = [
      ...new Set(
        raw
          .map(
            (st: Record<string, unknown>) =>
              (st.trip as Record<string, unknown>)?.serviceId as string,
          )
          .filter(Boolean),
      ),
    ];

    const targetDate = dateStr ? new Date(dateStr) : new Date();

    const calendars = await db.calendar.findMany({
      where: { serviceId: { in: serviceIds } },
    });
    const calendarDates = await db.calendarDate.findMany({
      where: { serviceId: { in: serviceIds } },
    });

    const modeMap = await this.getModeMap();

    const result: ScheduleEntry[] = [];

    for (const st of raw) {
      const trip = st.trip as Record<string, unknown> | undefined;
      if (!trip) continue;

      const active = isServiceActive(
        trip.serviceId as string,
        targetDate,
        calendars,
        calendarDates,
      );
      if (!active) continue;

      result.push({
        tripId: trip.id as string,
        stopId: (st.stopId as string) ?? '',
        stopName: ((st.stop as Record<string, unknown>)?.name as string) ?? '',
        stopSequence: (st.stopSequence as number) ?? 0,
        arrivalTime: (st.arrivalTime as string) ?? '',
        departureTime: (st.departureTime as string) ?? '',
        arrivalSeconds: (st.arrivalSeconds as number | null) ?? null,
        departureSeconds: (st.departureSeconds as number | null) ?? null,
        headsign: (trip.headsign as string) ?? '',
        routeName:
          ((trip.route as Record<string, unknown>)?.longName as string) ??
          ((trip.route as Record<string, unknown>)?.shortName as string) ??
          '',
        mode:
          (modeMap.get(
            (trip.route as Record<string, unknown>)?.transitModeId as string,
          ) as string) ?? '',
      });

      if (result.length >= limit) break;
    }

    return { data: result, meta: { count: result.length } };
  }

  private buildDepartures(
    raw: any[],
    currentSeconds: number,
    limit: number,
    today: Date,
    calendars: any[],
    calendarDates: any[],
    modeMap: Map<string, string>,
  ): DepartureResponseDto[] {
    const result: DepartureResponseDto[] = [];

    for (const st of raw) {
      const trip = st.trip as Record<string, unknown> | undefined;
      if (!trip) continue;

      const active = isServiceActive(
        trip.serviceId as string,
        today,
        calendars,
        calendarDates,
      );
      if (!active) continue;

      const depSec = (st.departureSeconds as number) ?? currentSeconds + 1;
      if (currentSeconds > 0 && depSec < currentSeconds) continue;

      result.push({
        tripId: trip.id as string,
        routeId: ((trip.route as Record<string, unknown>)?.id as string) ?? '',
        routeName:
          ((trip.route as Record<string, unknown>)?.longName as string) ??
          ((trip.route as Record<string, unknown>)?.shortName as string) ??
          '',
        headsign: (trip.headsign as string) ?? '',
        departureTime: (st.departureTime as string) ?? '',
        departureSeconds: depSec,
        mode:
          (modeMap.get(
            (trip.route as Record<string, unknown>)?.transitModeId as string,
          ) as string) ?? '',
        stopName: (st.stop as Record<string, unknown>)?.name as
          | string
          | undefined,
      });

      if (result.length >= limit) break;
    }

    return result;
  }
}
