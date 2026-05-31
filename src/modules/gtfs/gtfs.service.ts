import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { GtfsImporterService } from './importer/gtfs-importer.service';
import { GtfsDatabaseImporterService } from './importer/gtfs-database-importer.service';
import { CacheInvalidationService } from './cache-invalidation.service';
import { ImportIntegrityService } from './services/import-integrity.service';
import { CsvReaderHelper } from './parser/helpers/csv-reader.helper';
import { AgencyParser } from './parser/parsers/agency.parser';
import { StopsParser } from './parser/parsers/stops.parser';
import { RoutesParser } from './parser/parsers/routes.parser';
import { CalendarParser } from './parser/parsers/calendar.parser';
import { TripParser } from './parser/parsers/trip.parser';
import { StopTimeParser } from './parser/parsers/stop-time.parser';
import { CalendarDateParser } from './parser/parsers/calendar-date.parser';
import { ShapeParser } from './parser/parsers/shape.parser';
import { AgencyNormalizer } from './normalizers/agency.normalizer';
import { StopNormalizer } from './normalizers/stop.normalizer';
import { RouteNormalizer } from './normalizers/route.normalizer';
import { CalendarNormalizer } from './normalizers/calendar.normalizer';
import { TripNormalizer } from './normalizers/trip.normalizer';
import { StopTimeNormalizer } from './normalizers/stop-time.normalizer';
import { CalendarDateNormalizer } from './normalizers/calendar-date.normalizer';
import { ShapeNormalizer } from './normalizers/shape.normalizer';
import { FeedFormat } from '../transit-metadata/domain/enums/feed-format.enum';
import { FeedSourceType } from '../transit-metadata/domain/enums/feed-source-type.enum';
import { GtfsImportResult } from './types/gtfs-import-result.type';

@Injectable()
export class GtfsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly gtfsImporter: GtfsImporterService,
    private readonly dbImporter: GtfsDatabaseImporterService,
    private readonly cacheInvalidation: CacheInvalidationService,
    private readonly integrityService: ImportIntegrityService,
    private readonly csvReader: CsvReaderHelper,
    private readonly agencyParser: AgencyParser,
    private readonly stopsParser: StopsParser,
    private readonly routesParser: RoutesParser,
    private readonly calendarParser: CalendarParser,
    private readonly tripParser: TripParser,
    private readonly stopTimeParser: StopTimeParser,
    private readonly calendarDateParser: CalendarDateParser,
    private readonly shapeParser: ShapeParser,
    private readonly agencyNormalizer: AgencyNormalizer,
    private readonly stopNormalizer: StopNormalizer,
    private readonly routeNormalizer: RouteNormalizer,
    private readonly calendarNormalizer: CalendarNormalizer,
    private readonly tripNormalizer: TripNormalizer,
    private readonly stopTimeNormalizer: StopTimeNormalizer,
    private readonly calendarDateNormalizer: CalendarDateNormalizer,
    private readonly shapeNormalizer: ShapeNormalizer,
  ) {}

  async import(
    buffer: Buffer,
    source: string,
    countryCode: string,
    regionCode: string,
  ): Promise<GtfsImportResult> {
    const warnings: string[] = [];
    const errors: string[] = [];

    const { result, files } = this.gtfsImporter.importFromBuffer(
      buffer,
      source,
    );

    if (!result.success) {
      return {
        success: false,
        source,
        summary: {
          agenciesImported: 0,
          stopsImported: 0,
          routesImported: 0,
          calendarsImported: 0,
          tripsImported: 0,
          stopTimesImported: 0,
          calendarDatesImported: 0,
          shapesImported: 0,
          warnings: [],
          errors: result.summary.errors,
        },
      };
    }

    let regionId: string;
    let operatorId: string;

    try {
      regionId = await this.resolveRegionId(countryCode, regionCode);
      operatorId = await this.resolveOperatorId(regionId, source);
    } catch (error) {
      return this.failResult(source, errors, error);
    }

    const feedSourceId = await this.resolveFeedSource(operatorId, source);
    const transitModeByCode = await this.buildTransitModeMap();
    const context = { regionId, operatorId, feedSourceId, transitModeByCode };

    try {
      const summary = await this.prismaService.$transaction(
        async (tx) => {
          let agencyCount = 0;
          const agencyMap = new Map<string, string>();

          let stopCount = 0;
          const stopMap = new Map<string, string>();

          let routeCount = 0;
          const routeMap = new Map<string, string>();

          let calendarCount = 0;
          let tripCount = 0;
          const tripMap = new Map<string, string>();
          let stopTimeCount = 0;
          let calendarDateCount = 0;
          let shapeCount = 0;

          let parsedAgencies: any[] = [];
          let parsedStops: any[] = [];
          let parsedRoutes: any[] = [];
          let parsedTrips: any[] = [];
          let parsedStopTimes: any[] = [];

          if (files.has('agency.txt')) {
            const r = await this.csvReader.parseBuffer(
              files.get('agency.txt')!,
            );
            const { agencies, errors: e } = this.agencyParser.parse(r);
            const n = this.agencyNormalizer.normalize(agencies);
            parsedAgencies = n;
            errors.push(...e);
          }

          if (files.has('stops.txt')) {
            const r = await this.csvReader.parseBuffer(files.get('stops.txt')!);
            const { stops, errors: e } = this.stopsParser.parse(r);
            const n = this.stopNormalizer.normalize(
              stops,
              countryCode,
              regionCode,
            );
            parsedStops = n;
            errors.push(...e);
          }

          if (files.has('routes.txt')) {
            const r = await this.csvReader.parseBuffer(
              files.get('routes.txt')!,
            );
            const { routes, errors: e } = this.routesParser.parse(r);
            const n = this.routeNormalizer.normalize(routes);
            parsedRoutes = n;
            errors.push(...e);
          }

          if (files.has('trips.txt')) {
            const r = await this.csvReader.parseBuffer(files.get('trips.txt')!);
            const { trips, errors: e } = this.tripParser.parse(r);
            const n = this.tripNormalizer.normalize(trips);
            parsedTrips = n;
            errors.push(...e);
          }

          if (files.has('stop_times.txt')) {
            const r = await this.csvReader.parseBuffer(
              files.get('stop_times.txt')!,
            );
            const { stopTimes, errors: e } = this.stopTimeParser.parse(r);
            const { stopTimes: n } =
              this.stopTimeNormalizer.normalize(stopTimes);
            parsedStopTimes = n;
            errors.push(...e);
          }

          this.validateCrossReferences(
            {
              routes: parsedRoutes,
              trips: parsedTrips,
              stops: parsedStops,
              stopTimes: parsedStopTimes,
            },
            errors,
          );

          if (errors.length > 0) {
            return {
              agenciesImported: 0,
              stopsImported: 0,
              routesImported: 0,
              calendarsImported: 0,
              tripsImported: 0,
              stopTimesImported: 0,
              calendarDatesImported: 0,
              shapesImported: 0,
              warnings,
              errors,
            };
          }

          if (parsedAgencies.length > 0) {
            try {
              await this.prismaService.$transaction(async (innerTx) => {
                const ir = await this.dbImporter.importAgencies(
                  parsedAgencies,
                  context,
                  innerTx,
                );
                agencyCount = ir.imported;
                warnings.push(...ir.warnings);
                await this.buildAgencyMap(
                  { feedSourceId: context.feedSourceId },
                  agencyMap,
                  innerTx,
                );
              });
            } catch (e) {
              const msg = e instanceof Error ? e.message : 'Unknown error';
              warnings.push(`Agencies import failed: ${msg}`);
            }
          }

          if (parsedStops.length > 0) {
            try {
              await this.prismaService.$transaction(async (innerTx) => {
                const ir = await this.dbImporter.importStops(
                  parsedStops,
                  context,
                  innerTx,
                );
                stopCount = ir.imported;
                warnings.push(...ir.warnings);
                await this.buildStopMap(
                  { feedSourceId: context.feedSourceId },
                  stopMap,
                  innerTx,
                );
              });
            } catch (e) {
              const msg = e instanceof Error ? e.message : 'Unknown error';
              warnings.push(`Stops import failed: ${msg}`);
            }
          }

          if (parsedRoutes.length > 0) {
            try {
              await this.prismaService.$transaction(async (innerTx) => {
                const ir = await this.dbImporter.importRoutes(
                  parsedRoutes,
                  context,
                  agencyMap,
                  innerTx,
                );
                routeCount = ir.imported;
                warnings.push(...ir.warnings);
                await this.buildRouteMap(
                  { feedSourceId: context.feedSourceId },
                  routeMap,
                  innerTx,
                );
              });
            } catch (e) {
              const msg = e instanceof Error ? e.message : 'Unknown error';
              warnings.push(`Routes import failed: ${msg}`);
            }
          }

          if (files.has('calendar.txt')) {
            const r = await this.csvReader.parseBuffer(
              files.get('calendar.txt')!,
            );
            const { calendars, errors: e } = this.calendarParser.parse(r);
            const n = this.calendarNormalizer.normalize(calendars);
            errors.push(...e);
            if (n.length > 0) {
              try {
                await this.prismaService.$transaction(async (innerTx) => {
                  const ir = await this.dbImporter.importCalendars(
                    n,
                    context,
                    innerTx,
                  );
                  calendarCount = ir.imported;
                  warnings.push(...ir.warnings);
                });
              } catch (e) {
                const msg = e instanceof Error ? e.message : 'Unknown error';
                warnings.push(`Calendars import failed: ${msg}`);
              }
            }
          }

          if (parsedTrips.length > 0) {
            try {
              await this.prismaService.$transaction(async (innerTx) => {
                const { result: ir, tripMap: tm } =
                  await this.dbImporter.importTrips(
                    parsedTrips,
                    context,
                    routeMap,
                    innerTx,
                  );
                tripCount = ir.imported;
                warnings.push(...ir.warnings);
                for (const [k, v] of tm) tripMap.set(k, v);
              });
            } catch (e) {
              const msg = e instanceof Error ? e.message : 'Unknown error';
              warnings.push(`Trips import failed: ${msg}`);
            }
          }

          if (parsedStopTimes.length > 0) {
            try {
              await this.prismaService.$transaction(async (innerTx) => {
                const ir = await this.dbImporter.importStopTimes(
                  parsedStopTimes,
                  context,
                  tripMap,
                  stopMap,
                  innerTx,
                );
                stopTimeCount = ir.imported;
                warnings.push(...ir.warnings);
              });
            } catch (e) {
              const msg = e instanceof Error ? e.message : 'Unknown error';
              warnings.push(`StopTimes import failed: ${msg}`);
            }
          }

          if (files.has('calendar_dates.txt')) {
            const r = await this.csvReader.parseBuffer(
              files.get('calendar_dates.txt')!,
            );
            const { calendarDates, errors: e } =
              this.calendarDateParser.parse(r);
            const n = this.calendarDateNormalizer.normalize(calendarDates);
            errors.push(...e);
            if (n.length > 0) {
              try {
                await this.prismaService.$transaction(async (innerTx) => {
                  const ir = await this.dbImporter.importCalendarDates(
                    n,
                    context,
                    innerTx,
                  );
                  calendarDateCount = ir.imported;
                  warnings.push(...ir.warnings);
                });
              } catch (e) {
                const msg = e instanceof Error ? e.message : 'Unknown error';
                warnings.push(`CalendarDates import failed: ${msg}`);
              }
            }
          }

          if (files.has('shapes.txt')) {
            const r = await this.csvReader.parseBuffer(
              files.get('shapes.txt')!,
            );
            const { shapes, errors: e } = this.shapeParser.parse(r);
            const n = this.shapeNormalizer.normalize(shapes);
            errors.push(...e);
            if (n.length > 0) {
              try {
                await this.prismaService.$transaction(
                  async (innerTx) => {
                    const ir = await this.dbImporter.importShapes(
                      n,
                      context,
                      innerTx,
                    );
                    shapeCount = ir.imported;
                    warnings.push(...ir.warnings);
                  },
                  { timeout: 300000 },
                );
              } catch (e) {
                const msg = e instanceof Error ? e.message : 'Unknown error';
                warnings.push(`Shapes import failed: ${msg}`);
              }
            }
          }

          return {
            agenciesImported: agencyCount,
            stopsImported: stopCount,
            routesImported: routeCount,
            calendarsImported: calendarCount,
            tripsImported: tripCount,
            stopTimesImported: stopTimeCount,
            calendarDatesImported: calendarDateCount,
            shapesImported: shapeCount,
            warnings,
            errors,
          };
        },
        { timeout: 300000 },
      );

      const hasImports =
        summary.agenciesImported > 0 ||
        summary.stopsImported > 0 ||
        summary.routesImported > 0 ||
        summary.calendarsImported > 0 ||
        summary.tripsImported > 0 ||
        summary.stopTimesImported > 0 ||
        summary.calendarDatesImported > 0 ||
        summary.shapesImported > 0;

      if (hasImports) {
        await this.cacheInvalidation.onGtfsImportComplete();
      }

      return {
        success: summary.errors.length === 0,
        source,
        summary,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Transaction failed: ${msg}`);
      return {
        success: false,
        source,
        summary: {
          agenciesImported: 0,
          stopsImported: 0,
          routesImported: 0,
          calendarsImported: 0,
          tripsImported: 0,
          stopTimesImported: 0,
          calendarDatesImported: 0,
          shapesImported: 0,
          warnings,
          errors,
        },
      };
    }
  }

  private validateCrossReferences(
    parsed: {
      routes?: any[];
      trips?: any[];
      stops?: any[];
      stopTimes?: any[];
    },
    errors: string[],
  ): void {
    const routeIds = new Set(
      parsed.routes?.map((r) => r.gtfsRouteId as string) ?? [],
    );
    const tripIds = new Set(
      parsed.trips?.map((t) => t.gtfsTripId as string) ?? [],
    );
    const stopIds = new Set(
      parsed.stops?.map((s) => s.gtfsStopId as string) ?? [],
    );

    if (parsed.trips) {
      for (const trip of parsed.trips) {
        if (!routeIds.has(trip.routeId as string)) {
          errors.push(
            `Trip '${trip.gtfsTripId}' references route_id '${trip.routeId}' which does not exist in routes.txt`,
          );
        }
      }
    }

    if (parsed.stopTimes) {
      for (const st of parsed.stopTimes) {
        if (!tripIds.has(st.tripId as string)) {
          errors.push(
            `StopTime with trip_id '${st.tripId}' references a trip that does not exist in trips.txt`,
          );
        }
        if (!stopIds.has(st.stopId as string)) {
          errors.push(
            `StopTime with stop_id '${st.stopId}' references a stop that does not exist in stops.txt`,
          );
        }
      }
    }
  }

  private async resolveRegionId(
    countryCode: string,
    regionCode: string,
  ): Promise<string> {
    const country = await this.prismaService.country.findUnique({
      where: { code: countryCode },
    });
    if (!country)
      throw new BadRequestException(`Country not found: '${countryCode}'`);

    const region = await this.prismaService.region.findFirst({
      where: { countryId: country.id, code: regionCode.toUpperCase() },
    });
    if (!region)
      throw new BadRequestException(`Region not found: '${regionCode}'`);

    return region.id;
  }

  private async resolveOperatorId(
    regionId: string,
    source: string,
  ): Promise<string> {
    const normalized = source.toUpperCase().replace(/-/g, '_');
    const operator = await this.prismaService.operator.findFirst({
      where: { regionId, code: normalized },
    });
    if (!operator)
      throw new BadRequestException(`Operator not found: '${source}'`);
    return operator.id;
  }

  private async resolveFeedSource(
    operatorId: string,
    source: string,
  ): Promise<string> {
    const normalized = source.toUpperCase().replace(/-/g, '_');
    const name = `${normalized} GTFS Static`;

    let feedSource = await this.prismaService.feedSource.findFirst({
      where: { operatorId, type: FeedSourceType.GTFS_STATIC, name },
    });

    if (!feedSource) {
      feedSource = await this.prismaService.feedSource.create({
        data: {
          operatorId,
          type: FeedSourceType.GTFS_STATIC,
          name,
          format: FeedFormat.GTFS_ZIP,
          isActive: true,
        },
      });
    }

    return feedSource.id;
  }

  private async buildTransitModeMap(): Promise<Map<string, string>> {
    const modes = await this.prismaService.transitMode.findMany();
    const map = new Map<string, string>();
    for (const m of modes) map.set(m.code, m.id);
    return map;
  }

  private async buildRouteMap(
    context: { feedSourceId?: string | null },
    routeMap: Map<string, string>,
    tx?: unknown,
  ): Promise<void> {
    const db = tx ?? this.prismaService;
    const where: Record<string, unknown> = {};
    if (context.feedSourceId) where.feedSourceId = context.feedSourceId;
    const routes = await (db as any).route.findMany({
      where,
      select: { id: true, externalRouteId: true },
    });
    for (const r of routes) {
      if (r.externalRouteId) routeMap.set(r.externalRouteId, r.id);
    }
  }

  private async buildAgencyMap(
    context: { feedSourceId?: string | null },
    agencyMap: Map<string, string>,
    tx?: unknown,
  ): Promise<void> {
    const db = tx ?? this.prismaService;
    const where: Record<string, unknown> = {};
    if (context.feedSourceId) where.feedSourceId = context.feedSourceId;
    const agencies = await (db as any).agency.findMany({
      where,
      select: { id: true, externalAgencyId: true },
    });
    for (const a of agencies) {
      if (a.externalAgencyId) agencyMap.set(a.externalAgencyId, a.id);
    }
  }

  private async buildStopMap(
    context: { feedSourceId?: string | null },
    stopMap: Map<string, string>,
    tx?: unknown,
  ): Promise<void> {
    const db = tx ?? this.prismaService;
    const where: Record<string, unknown> = {};
    if (context.feedSourceId) where.feedSourceId = context.feedSourceId;
    const stops = await (db as any).stop.findMany({
      where,
      select: { id: true, externalStopId: true },
    });
    for (const s of stops) {
      if (s.externalStopId) stopMap.set(s.externalStopId, s.id);
    }
  }

  private failResult(
    source: string,
    errors: string[],
    error: unknown,
  ): GtfsImportResult {
    errors.push(
      error instanceof Error ? error.message : 'Context resolution failed',
    );
    return {
      success: false,
      source,
      summary: {
        agenciesImported: 0,
        stopsImported: 0,
        routesImported: 0,
        calendarsImported: 0,
        tripsImported: 0,
        stopTimesImported: 0,
        calendarDatesImported: 0,
        shapesImported: 0,
        warnings: [],
        errors,
      },
    };
  }
}
