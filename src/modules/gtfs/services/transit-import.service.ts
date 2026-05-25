import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { GtfsParserService } from './gtfs-parser.service';
import { GtfsValidatorService } from './gtfs-validator.service';
import { GtfsMapperService } from './gtfs-mapper.service';
import {
  JakartaImportService,
  JakartaImportContext,
} from './jakarta-import.service';
import { ImportJobService } from '../application/services/import-job.service';
import { CacheInvalidationService } from '../cache-invalidation.service';
import { ImportSummaryDto } from '../dto/import-summary.dto';
import { ImportResponseDto } from '../dto/import-response.dto';

const STOP_TIME_CHUNK_SIZE = 500;

@Injectable()
export class TransitImportService {
  private readonly logger = new Logger(TransitImportService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly gtfsParserService: GtfsParserService,
    private readonly gtfsValidatorService: GtfsValidatorService,
    private readonly gtfsMapperService: GtfsMapperService,
    private readonly jakartaImportService: JakartaImportService,
    private readonly importJobService: ImportJobService,
    private readonly cacheInvalidation: CacheInvalidationService,
  ) {}

  async importJakartaFeed(
    feedSourceId: string,
    dirPath: string,
  ): Promise<ImportResponseDto> {
    const errors: string[] = [];
    let importJobId: string | null = null;

    try {
      const job = await this.importJobService.create({ feedSourceId });
      importJobId = job.id;
      await this.importJobService.markRunning(importJobId);

      this.logger.log(
        `Import started: feedSourceId=${feedSourceId}, path=${dirPath}`,
      );

      const fileData = this.gtfsParserService.parseDirectory(dirPath);
      const validation = this.gtfsValidatorService.validate(fileData);
      if (!validation.valid) {
        errors.push(...validation.errors);
        throw new Error(`Validation failed: ${validation.errors.join('; ')}`);
      }

      const context =
        await this.jakartaImportService.buildContext(feedSourceId);

      const result = await this.prismaService.$transaction(async () => {
        const agencyRows = fileData.get('agency.txt') || [];
        const routeRows = fileData.get('routes.txt') || [];
        const stopRows = fileData.get('stops.txt') || [];
        const tripRows = fileData.get('trips.txt') || [];
        const stopTimeRows = fileData.get('stop_times.txt') || [];
        const calendarRows = fileData.get('calendar.txt') || [];

        const agencyMap = await this.importAgencies(agencyRows, context);
        const routeMap = await this.importRoutes(routeRows, agencyMap, context);
        const stopMap = await this.importStops(stopRows, context);
        const calendarSet = await this.importCalendars(calendarRows, context);
        const tripMap = await this.importTrips(tripRows, routeMap, context);
        const stopTimeCount = await this.importStopTimes(
          stopTimeRows,
          tripMap,
          stopMap,
        );
        await this.resolveParentStations(stopRows, stopMap);

        const summary: ImportSummaryDto = {
          agencies: agencyMap.size,
          routes: routeMap.size,
          stops: stopMap.size,
          trips: tripMap.size,
          stopTimes: stopTimeCount,
          calendars: calendarSet.size,
        };

        await this.importJobService.markSuccess(
          importJobId!,
          summary as unknown as Record<string, unknown>,
        );
        this.logger.log(`Import success: ${JSON.stringify(summary)}`);

        return {
          success: true,
          feedSourceId,
          importJobId: importJobId!,
          summary,
          errors,
        };
      });

      await this.cacheInvalidation.onGtfsImportComplete();

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Import failed: ${message}`);

      if (importJobId) {
        await this.importJobService.markFailed(importJobId, message);
      }

      errors.push(message);

      return {
        success: false,
        feedSourceId,
        importJobId: importJobId || '',
        summary: {
          agencies: 0,
          routes: 0,
          stops: 0,
          trips: 0,
          stopTimes: 0,
          calendars: 0,
        },
        errors,
      };
    }
  }

  private async importAgencies(
    rows: Record<string, string>[],
    context: JakartaImportContext,
  ): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    const db = this.prismaService as unknown as {
      agency: {
        findFirst: (args: unknown) => Promise<{ id: string } | null>;
        findMany: (args: unknown) => Promise<{ slug: string }[]>;
        create: (args: unknown) => Promise<{ id: string }>;
        update: (args: unknown) => Promise<{ id: string }>;
      };
    };

    const existingAgencies = await db.agency.findMany({
      where: { regionId: context.regionId },
      select: { slug: true },
    });
    const dbSlugs = new Set(existingAgencies.map((a) => a.slug));
    const batchSlugs = new Set<string>();

    for (const row of rows) {
      const gtfsAgency = row as unknown as Parameters<
        GtfsMapperService['mapAgency']
      >[0];
      const input = this.gtfsMapperService.mapAgency(
        gtfsAgency,
        context.feedSourceId,
        context.regionId,
        context.operatorId,
      );

      let slug = input.slug;
      let counter = 2;
      while (dbSlugs.has(slug) || batchSlugs.has(slug)) {
        slug = `${input.slug}-${counter}`;
        counter++;
      }
      batchSlugs.add(slug);
      input.slug = slug;

      const externalId = input.externalAgencyId || undefined;
      const existing = externalId
        ? await db.agency.findFirst({
            where: {
              feedSourceId: context.feedSourceId,
              externalAgencyId: externalId,
            },
          })
        : null;

      let agency: { id: string };
      if (existing) {
        agency = await db.agency.update({
          where: { id: existing.id },
          data: input,
        });
      } else {
        agency = await db.agency.create({ data: input });
      }

      if (gtfsAgency.agency_id) map.set(gtfsAgency.agency_id, agency.id);
    }

    return map;
  }

  private async importRoutes(
    rows: Record<string, string>[],
    agencyMap: Map<string, string>,
    context: JakartaImportContext,
  ): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    const db = this.prismaService as unknown as {
      route: {
        findFirst: (args: unknown) => Promise<{ id: string } | null>;
        create: (args: unknown) => Promise<{ id: string }>;
        update: (args: unknown) => Promise<{ id: string }>;
      };
    };

    for (const row of rows) {
      const gtfsRoute = row as unknown as Parameters<
        GtfsMapperService['mapRoute']
      >[0];
      const agencyId = agencyMap.get(gtfsRoute.agency_id || '') || '';
      if (!agencyId) continue;

      const modeCode =
        this.gtfsMapperService.resolveTransitModeCode(gtfsRoute.route_type) ||
        'BUS';
      const transitModeId = context.transitModeByCode.get(modeCode) || '';

      const input = this.gtfsMapperService.mapRoute(
        gtfsRoute,
        context.feedSourceId,
        agencyId,
        transitModeId,
      );

      const externalId = input.externalRouteId || undefined;
      const existing = externalId
        ? await db.route.findFirst({
            where: {
              feedSourceId: context.feedSourceId,
              externalRouteId: externalId,
            },
          })
        : null;

      let route: { id: string };
      if (existing) {
        route = await db.route.update({
          where: { id: existing.id },
          data: input,
        });
      } else {
        route = await db.route.create({ data: input });
      }

      map.set(gtfsRoute.route_id, route.id);
    }

    return map;
  }

  private async importStops(
    rows: Record<string, string>[],
    context: JakartaImportContext,
  ): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    const db = this.prismaService as unknown as {
      stop: {
        findFirst: (args: unknown) => Promise<{ id: string } | null>;
        create: (args: unknown) => Promise<{ id: string }>;
        update: (args: unknown) => Promise<{ id: string }>;
      };
    };

    for (const row of rows) {
      const gtfsStop = row as unknown as Parameters<
        GtfsMapperService['mapStop']
      >[0];
      const input = this.gtfsMapperService.mapStop(
        gtfsStop,
        context.feedSourceId,
        context.regionId,
      );

      const externalId = input.externalStopId || undefined;
      const existing = externalId
        ? await db.stop.findFirst({
            where: {
              feedSourceId: context.feedSourceId,
              externalStopId: externalId,
            },
          })
        : null;

      let stop: { id: string };
      if (existing) {
        stop = await db.stop.update({
          where: { id: existing.id },
          data: input,
        });
      } else {
        stop = await db.stop.create({ data: input });
      }

      map.set(gtfsStop.stop_id, stop.id);
    }

    return map;
  }

  private async importCalendars(
    rows: Record<string, string>[],
    context: JakartaImportContext,
  ): Promise<Set<string>> {
    const set = new Set<string>();
    const db = this.prismaService as unknown as {
      calendar: {
        findFirst: (args: unknown) => Promise<{ id: string } | null>;
        create: (args: unknown) => Promise<{ id: string }>;
        update: (args: unknown) => Promise<{ id: string }>;
      };
    };

    for (const row of rows) {
      const gtfsCal = row as unknown as Parameters<
        GtfsMapperService['mapCalendar']
      >[0];
      const input = this.gtfsMapperService.mapCalendar(
        gtfsCal,
        context.feedSourceId,
      );

      const existing = await db.calendar.findFirst({
        where: {
          feedSourceId: context.feedSourceId,
          serviceId: input.serviceId,
        },
      });

      if (existing) {
        await db.calendar.update({
          where: { id: existing.id },
          data: input,
        });
      } else {
        await db.calendar.create({ data: input });
      }

      set.add(input.serviceId);
    }

    return set;
  }

  private async importTrips(
    rows: Record<string, string>[],
    routeMap: Map<string, string>,
    context: JakartaImportContext,
  ): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    const db = this.prismaService as unknown as {
      trip: {
        findFirst: (args: unknown) => Promise<{ id: string } | null>;
        create: (args: unknown) => Promise<{ id: string }>;
        update: (args: unknown) => Promise<{ id: string }>;
      };
    };

    for (const row of rows) {
      const gtfsTrip = row as unknown as Parameters<
        GtfsMapperService['mapTrip']
      >[0];
      const routeId = routeMap.get(gtfsTrip.route_id) || '';
      if (!routeId) continue;

      const input = this.gtfsMapperService.mapTrip(
        gtfsTrip,
        context.feedSourceId,
        routeId,
      );

      const externalId = input.externalTripId || undefined;
      const existing = externalId
        ? await db.trip.findFirst({
            where: {
              feedSourceId: context.feedSourceId,
              externalTripId: externalId,
            },
          })
        : null;

      let trip: { id: string };
      if (existing) {
        trip = await db.trip.update({
          where: { id: existing.id },
          data: input,
        });
      } else {
        trip = await db.trip.create({ data: input });
      }

      map.set(gtfsTrip.trip_id, trip.id);
    }

    return map;
  }

  private async importStopTimes(
    rows: Record<string, string>[],
    tripMap: Map<string, string>,
    stopMap: Map<string, string>,
  ): Promise<number> {
    const mapped: Record<string, unknown>[] = [];

    for (const row of rows) {
      const gtfsSt = row as unknown as Parameters<
        GtfsMapperService['mapStopTime']
      >[0];
      const tripId = tripMap.get(gtfsSt.trip_id) || '';
      const stopId = stopMap.get(gtfsSt.stop_id) || '';
      if (!tripId || !stopId) continue;

      const input = this.gtfsMapperService.mapStopTime(gtfsSt, tripId, stopId);
      mapped.push(input);
    }

    const tripIds = [
      ...new Set(mapped.map((st: Record<string, unknown>) => st.tripId)),
    ];
    if (tripIds.length > 0) {
      await (this.prismaService as any).stopTime.deleteMany({
        where: { tripId: { in: tripIds } },
      });
    }

    for (let i = 0; i < mapped.length; i += STOP_TIME_CHUNK_SIZE) {
      const chunk = mapped.slice(i, i + STOP_TIME_CHUNK_SIZE);

      await (this.prismaService as any).stopTime.createMany({
        data: chunk,
      });
    }

    return mapped.length;
  }

  private async resolveParentStations(
    rows: Record<string, string>[],
    stopMap: Map<string, string>,
  ): Promise<void> {
    for (const row of rows) {
      const gtfsStop = row as unknown as Parameters<
        GtfsMapperService['mapStop']
      >[0];
      if (!gtfsStop.parent_station) continue;

      const childId = stopMap.get(gtfsStop.stop_id);
      const parentId = stopMap.get(gtfsStop.parent_station);
      if (!childId || !parentId) continue;

      await this.prismaService.stop.update({
        where: { id: childId },
        data: { parentStationId: parentId },
      });
    }
  }
}
