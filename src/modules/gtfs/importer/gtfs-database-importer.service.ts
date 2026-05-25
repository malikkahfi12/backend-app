import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { GtfsRouteTypeMapper } from '../mappers/gtfs-route-type.mapper';
import { ParsedAgency } from '../types/gtfs-agency.type';
import { ParsedStop } from '../types/gtfs-stop.type';
import { ParsedRoute } from '../types/gtfs-route.type';
import { ParsedTrip } from '../types/gtfs-trip.type';
import { ParsedStopTime } from '../types/gtfs-stop-time.type';
import { ParsedCalendar } from '../types/gtfs-calendar.type';
import { ParsedCalendarDate } from '../types/gtfs-calendar-date.type';
import { ParsedShape } from '../types/gtfs-shape.type';
import { parseGtfsTimeToSeconds } from '../utils/gtfs-time.util';
import { withRetry } from '../../../common/utils/retry.util';

const BATCH_SIZE = 500;
const STOP_TIME_BATCH = 1000;

const AUTO_COLUMNS = new Set(['id', 'createdAt', 'updatedAt']);

export interface ImportContext {
  regionId: string;
  operatorId: string;
  feedSourceId?: string | null;
  transitModeByCode: Map<string, string>;
}

export interface EntityImportResult {
  imported: number;
  skipped: number;
  warnings: string[];
}

@Injectable()
export class GtfsDatabaseImporterService {
  private readonly logger = new Logger(GtfsDatabaseImporterService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly routeTypeMapper: GtfsRouteTypeMapper,
  ) {}

  private db(tx?: unknown): any {
    return tx ?? this.prismaService;
  }

  async importAgencies(
    agencies: ParsedAgency[],
    context: ImportContext,
    tx?: unknown,
  ): Promise<EntityImportResult> {
    const warnings: string[] = [];
    const db = this.db(tx);

    const existingAgencies = await db.agency.findMany({
      where: { regionId: context.regionId },
      select: { slug: true },
    });
    const dbSlugs = new Set(
      existingAgencies.map((a: { slug: string }) => a.slug),
    );
    const batchSlugs = new Set<string>();

    const rows = agencies.map((agency) => {
      const baseSlug = this.slugify(agency.name);
      let slug = baseSlug;
      let counter = 2;
      while (dbSlugs.has(slug) || batchSlugs.has(slug)) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
      batchSlugs.add(slug);

      return {
        feedSourceId: context.feedSourceId || null,
        externalAgencyId: agency.gtfsAgencyId || null,
        regionId: context.regionId,
        operatorId: context.operatorId,
        name: agency.name,
        slug,
        timezone: agency.timezone,
        language: agency.lang || 'id',
        phone: agency.phone || null,
        website: agency.url || null,
        isActive: true,
      };
    });

    let imported = 0;
    const skipped = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const chunk = rows.slice(i, i + BATCH_SIZE);
      try {
        await withRetry(
          async () => {
            for (const row of chunk) {
              const existing = await db.agency.findFirst({
                where: {
                  feedSourceId: row.feedSourceId,
                  externalAgencyId: row.externalAgencyId,
                },
              });
              if (existing) {
                await db.agency.update({
                  where: { id: existing.id },
                  data: row,
                });
              } else {
                await db.agency.create({ data: row });
              }
              imported++;
            }
          },
          this.logger,
          `Agencies batch ${i}`,
        );
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        warnings.push(`Agency batch ${i}: ${msg}`);
      }
    }

    this.logger.log(`Agencies imported: ${imported}, skipped: ${skipped}`);
    return { imported, skipped, warnings };
  }

  async importStops(
    stops: ParsedStop[],
    context: ImportContext,
    tx?: unknown,
  ): Promise<EntityImportResult> {
    const warnings: string[] = [];
    const seen = new Set<string>();
    const deduped: Record<string, unknown>[] = [];
    const parentRefs = new Map<string, string>();
    let skipped = 0;

    const db = this.db(tx);
    const existingStops = await db.stop.findMany({
      where: { regionId: context.regionId },
      select: { slug: true },
    });
    const dbSlugs = new Set(existingStops.map((s: { slug: string }) => s.slug));
    const batchSlugs = new Set<string>();

    for (const stop of stops) {
      if (seen.has(stop.gtfsStopId)) {
        skipped++;
        continue;
      }
      seen.add(stop.gtfsStopId);

      if (stop.parentStation) {
        parentRefs.set(stop.gtfsStopId, stop.parentStation);
      }

      const baseSlug = this.slugify(stop.name);
      let slug = baseSlug;
      let counter = 2;
      while (dbSlugs.has(slug) || batchSlugs.has(slug)) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
      batchSlugs.add(slug);

      deduped.push({
        feedSourceId: context.feedSourceId || null,
        externalStopId: stop.gtfsStopId,
        regionId: context.regionId,
        code: stop.code || null,
        name: stop.name,
        slug,
        latitude: stop.lat,
        longitude: stop.lng,
        address: stop.stopDesc || null,
        locationType: stop.locationType ?? null,
        isStation: stop.locationType === 1,
        parentStationId: null,
        isActive: true,
      });
    }

    if (skipped > 0) {
      warnings.push(`${skipped} duplicate gtfsStopId values skipped`);
    }

    let imported = 0;

    for (let i = 0; i < deduped.length; i += BATCH_SIZE) {
      const chunk = deduped.slice(i, i + BATCH_SIZE);
      try {
        await withRetry(
          async () => {
            await this.batchUpsert(
              db,
              'gtfs_stops',
              ['feed_source_id', 'external_stop_id'],
              chunk,
            );
          },
          this.logger,
          `Stops batch ${i}`,
        );
        imported += chunk.length;
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        warnings.push(`Stop batch ${i}: ${msg}`);
      }
    }

    await this.bulkUpdatePostgis(context, db);

    if (parentRefs.size > 0) {
      try {
        await this.resolveParentStations(context, parentRefs, db);
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        warnings.push(`Parent station resolution failed: ${msg}`);
      }
    }

    this.logger.log(`Stops imported: ${imported}`);
    return { imported, skipped, warnings };
  }

  private async resolveParentStations(
    context: ImportContext,
    parentRefs: Map<string, string>,
    db: any,
  ): Promise<void> {
    const feedSourceId = context.feedSourceId || null;
    const allExternalIds = [...parentRefs.keys(), ...parentRefs.values()];

    const resolved = await db.stop.findMany({
      where: {
        feedSourceId,
        externalStopId: { in: allExternalIds },
      },
      select: { id: true, externalStopId: true },
    });

    const idLookup = new Map<string, string>();
    for (const s of resolved) {
      idLookup.set(s.externalStopId, s.id);
    }

    let resolvedCount = 0;
    for (const [childExternalId, parentExternalId] of parentRefs) {
      const childId = idLookup.get(childExternalId);
      const parentId = idLookup.get(parentExternalId);
      if (!childId || !parentId) continue;

      await db.stop.update({
        where: { id: childId },
        data: { parentStationId: parentId },
      });
      resolvedCount++;
    }

    if (resolvedCount > 0) {
      this.logger.log(
        `Parent station relationships resolved: ${resolvedCount}`,
      );
    }
  }

  async importRoutes(
    routes: ParsedRoute[],
    context: ImportContext,
    agencyMap?: Map<string, string>,
    tx?: unknown,
  ): Promise<EntityImportResult> {
    const warnings: string[] = [];
    const mapped: Record<string, unknown>[] = [];

    for (const route of routes) {
      const { code, warning } = this.routeTypeMapper.map(route.routeType);
      if (warning) warnings.push(`Route '${route.gtfsRouteId}': ${warning}`);

      const transitModeId = context.transitModeByCode.get(code) || '';
      const agencyId = agencyMap?.get(route.agencyId || '') || null;

      mapped.push({
        feedSourceId: context.feedSourceId || null,
        externalRouteId: route.gtfsRouteId,
        agencyId,
        transitModeId: transitModeId || null,
        shortName: route.shortName,
        longName: route.longName,
        description: route.description || null,
        color: route.color || null,
        textColor: route.textColor || null,
        isActive: true,
      });
    }

    const db = this.db(tx);
    let imported = 0;

    for (let i = 0; i < mapped.length; i += BATCH_SIZE) {
      const chunk = mapped.slice(i, i + BATCH_SIZE);
      try {
        await withRetry(
          async () => {
            await this.batchUpsert(
              db,
              'gtfs_routes',
              ['feed_source_id', 'external_route_id'],
              chunk,
            );
          },
          this.logger,
          `Routes batch ${i}`,
        );
        imported += chunk.length;
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        warnings.push(`Route batch ${i}: ${msg}`);
      }
    }

    this.logger.log(`Routes imported: ${imported}`);
    return { imported, skipped: 0, warnings };
  }

  async importCalendars(
    calendars: ParsedCalendar[],
    context: ImportContext,
    tx?: unknown,
  ): Promise<EntityImportResult> {
    const warnings: string[] = [];
    const db = this.db(tx);

    const rows = calendars.map((cal) => ({
      feedSourceId: context.feedSourceId || null,
      serviceId: cal.serviceId,
      regionId: context.regionId,
      operatorId: context.operatorId,
      monday: cal.monday,
      tuesday: cal.tuesday,
      wednesday: cal.wednesday,
      thursday: cal.thursday,
      friday: cal.friday,
      saturday: cal.saturday,
      sunday: cal.sunday,
      startDate: this.gtfsDateToDate(cal.startDate),
      endDate: this.gtfsDateToDate(cal.endDate),
      isActive: true,
    }));

    let imported = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const chunk = rows.slice(i, i + BATCH_SIZE);
      try {
        await withRetry(
          async () => {
            for (const row of chunk) {
              const existing = await db.calendar.findFirst({
                where: {
                  feedSourceId: row.feedSourceId,
                  serviceId: row.serviceId,
                },
              });
              if (existing) {
                await db.calendar.update({
                  where: { id: existing.id },
                  data: row,
                });
              } else {
                await db.calendar.create({ data: row });
              }
              imported++;
            }
          },
          this.logger,
          `Calendars batch ${i}`,
        );
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        warnings.push(`Calendar batch ${i}: ${msg}`);
      }
    }

    this.logger.log(`Calendars imported: ${imported}`);
    return { imported, skipped: 0, warnings };
  }

  async importTrips(
    trips: ParsedTrip[],
    context: ImportContext,
    routeMap: Map<string, string>,
    tx?: unknown,
  ): Promise<{ result: EntityImportResult; tripMap: Map<string, string> }> {
    const warnings: string[] = [];
    const mapped: Record<string, unknown>[] = [];
    const tripMap = new Map<string, string>();
    const seen = new Set<string>();
    let skipped = 0;

    const missingRouteIds = new Set<string>();
    for (const trip of trips) {
      if (!routeMap.has(trip.routeId)) {
        missingRouteIds.add(trip.routeId);
      }
    }

    if (missingRouteIds.size > 0) {
      const db = this.db(tx);
      try {
        await this.ensureMissingRoutes(missingRouteIds, context, routeMap, db);
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        warnings.push(`Failed to create placeholder routes: ${msg}`);
      }
    }

    for (const trip of trips) {
      if (seen.has(trip.gtfsTripId)) {
        skipped++;
        continue;
      }
      seen.add(trip.gtfsTripId);

      const routeId = routeMap.get(trip.routeId);
      if (!routeId) {
        warnings.push(
          `Trip '${trip.gtfsTripId}': route_id '${trip.routeId}' not found, skipped`,
        );
        skipped++;
        continue;
      }

      mapped.push({
        feedSourceId: context.feedSourceId || null,
        externalTripId: trip.gtfsTripId,
        routeId,
        serviceId: trip.serviceId,
        headsign: trip.headsign || '',
        directionId: trip.directionId ?? null,
        blockId: trip.blockId || null,
        regionId: context.regionId,
        operatorId: context.operatorId,
        externalShapeId: trip.shapeId || null,
        isActive: true,
      });
    }

    if (skipped > 0) {
      warnings.push(`${skipped} trips skipped (missing route_id reference)`);
    }

    const db = this.db(tx);
    let imported = 0;

    for (let i = 0; i < mapped.length; i += BATCH_SIZE) {
      const chunk = mapped.slice(i, i + BATCH_SIZE);
      try {
        await withRetry(
          async () => {
            await this.batchUpsert(
              db,
              'gtfs_trips',
              ['feed_source_id', 'external_trip_id'],
              chunk,
            );
          },
          this.logger,
          `Trips batch ${i}`,
        );
        imported += chunk.length;
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        warnings.push(`Trip batch ${i}: ${msg}`);
      }
    }

    if (imported > 0) {
      const dbTrips = await db.trip.findMany({
        where: {
          externalTripId: { in: [...seen] },
          operatorId: context.operatorId,
        },
        select: { id: true, externalTripId: true },
      });
      for (const t of dbTrips) {
        tripMap.set(t.externalTripId, t.id);
      }
    }

    this.logger.log(`Trips imported: ${imported}`);
    return { result: { imported, skipped, warnings }, tripMap };
  }

  async importStopTimes(
    stopTimes: ParsedStopTime[],
    _context: ImportContext,
    tripMap: Map<string, string>,
    stopMap: Map<string, string>,
    tx?: unknown,
  ): Promise<EntityImportResult> {
    const warnings: string[] = [];
    const mapped: Record<string, unknown>[] = [];
    let skipped = 0;

    for (const st of stopTimes) {
      const tripId = tripMap.get(st.tripId);
      const stopId = stopMap.get(st.stopId);

      if (!tripId) {
        skipped++;
        continue;
      }
      if (!stopId) {
        skipped++;
        continue;
      }

      mapped.push({
        tripId,
        stopId,
        stopSequence: st.stopSequence,
        arrivalTime: st.arrivalTime,
        departureTime: st.departureTime,
        arrivalSeconds: st.arrivalTime
          ? parseGtfsTimeToSeconds(st.arrivalTime)
          : null,
        departureSeconds: st.departureTime
          ? parseGtfsTimeToSeconds(st.departureTime)
          : null,
        pickupType: st.pickupType ?? null,
        dropOffType: st.dropOffType ?? null,
      });
    }

    if (skipped > 0) {
      warnings.push(
        `${skipped} stop_times skipped (missing trip or stop reference)`,
      );
    }

    const db = this.db(tx);
    let imported = 0;

    for (let i = 0; i < mapped.length; i += STOP_TIME_BATCH) {
      const chunk = mapped.slice(i, i + STOP_TIME_BATCH);
      try {
        await withRetry(
          async () => {
            await this.batchUpsert(
              db,
              'gtfs_stop_times',
              ['trip_id', 'stop_sequence'],
              chunk,
            );
          },
          this.logger,
          `StopTimes batch ${i}`,
        );
        imported += chunk.length;
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        warnings.push(`StopTime batch ${i}: ${msg}`);
      }
    }

    const fullSkipped = mapped.length - imported + skipped;
    if (fullSkipped > 0) {
      warnings.push(
        `${fullSkipped} stop_times skipped (missing trip or stop reference)`,
      );
    }

    this.logger.log(`StopTimes imported: ${imported}`);
    return { imported, skipped: fullSkipped, warnings };
  }

  async importCalendarDates(
    calendarDates: ParsedCalendarDate[],
    context: ImportContext,
    tx?: unknown,
  ): Promise<EntityImportResult> {
    const warnings: string[] = [];
    const mapped: Record<string, unknown>[] = [];

    for (const cd of calendarDates) {
      mapped.push({
        feedSourceId: context.feedSourceId || null,
        serviceId: cd.serviceId,
        date: this.gtfsDateToDate(cd.date),
        exceptionType: cd.exceptionType,
        regionId: context.regionId,
        operatorId: context.operatorId,
      });
    }

    const db = this.db(tx);
    let imported = 0;

    for (let i = 0; i < mapped.length; i += BATCH_SIZE) {
      const chunk = mapped.slice(i, i + BATCH_SIZE);
      try {
        await withRetry(
          async () => {
            await this.batchUpsert(
              db,
              'gtfs_calendar_dates',
              ['feed_source_id', 'service_id', 'date'],
              chunk,
            );
          },
          this.logger,
          `CalendarDates batch ${i}`,
        );
        imported += chunk.length;
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        warnings.push(`CalendarDate batch ${i}: ${msg}`);
      }
    }

    this.logger.log(`CalendarDates imported: ${imported}`);
    return { imported, skipped: 0, warnings };
  }

  async importShapes(
    shapes: ParsedShape[],
    context: ImportContext,
    tx?: unknown,
  ): Promise<EntityImportResult> {
    const warnings: string[] = [];
    const mapped: Record<string, unknown>[] = [];

    for (const shape of shapes) {
      mapped.push({
        feedSourceId: context.feedSourceId || null,
        externalShapeId: shape.shapeId,
        shapePtLat: shape.shapePtLat,
        shapePtLon: shape.shapePtLon,
        shapePtSequence: shape.shapePtSequence,
        shapeDistTraveled: shape.shapeDistTraveled ?? null,
      });
    }

    const db = this.db(tx);
    let imported = 0;

    for (let i = 0; i < mapped.length; i += BATCH_SIZE) {
      const chunk = mapped.slice(i, i + BATCH_SIZE);
      try {
        await withRetry(
          async () => {
            await this.batchUpsert(
              db,
              'gtfs_shapes',
              ['feed_source_id', 'external_shape_id', 'shape_pt_sequence'],
              chunk,
            );
          },
          this.logger,
          `Shapes batch ${i}`,
        );
        imported += chunk.length;
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        warnings.push(`Shapes batch ${i}: ${msg}`);
      }
    }

    this.logger.log(`Shapes imported: ${imported}`);
    return { imported, skipped: 0, warnings };
  }

  private async batchUpsert(
    db: unknown,
    table: string,
    conflictColumns: string[],
    data: Record<string, unknown>[],
  ): Promise<void> {
    if (data.length === 0) return;

    const originalKeys = Object.keys(data[0]).filter(
      (k) => !AUTO_COLUMNS.has(k),
    );
    const allColumns = originalKeys.map(camelToSnake);
    const cols = allColumns.map((c) => `"${c}"`).join(', ');
    const conflict = conflictColumns.map((c) => `"${c}"`).join(', ');

    const batchSize = 500;
    for (let start = 0; start < data.length; start += batchSize) {
      const chunk = data.slice(start, start + batchSize);
      const values = chunk
        .map(
          (row) =>
            `(${originalKeys.map((k) => formatSqlValue(row[k])).join(', ')})`,
        )
        .join(',\n');

      const updateSet = allColumns
        .filter((c) => !conflictColumns.includes(c))
        .map((c) => `"${c}" = EXCLUDED."${c}"`)
        .join(', ');

      const sql = `INSERT INTO "${table}" (${cols})
VALUES ${values}
ON CONFLICT (${conflict})
DO UPDATE SET ${updateSet}`;

      await (db as any).$executeRawUnsafe(sql);
    }
  }

  private async ensureMissingRoutes(
    missingRouteIds: Set<string>,
    context: ImportContext,
    routeMap: Map<string, string>,
    db: unknown,
  ): Promise<void> {
    const agencyId = await this.resolveAgencyId(context, db);
    const transitModeId = await this.resolveTransitModeId(db);

    for (const externalRouteId of missingRouteIds) {
      await (db as any).route.upsert({
        where: {
          feedSourceId_externalRouteId: {
            feedSourceId: context.feedSourceId || '',
            externalRouteId,
          },
        },
        update: { isActive: true },
        create: {
          feedSourceId: context.feedSourceId || null,
          externalRouteId,
          agencyId,
          transitModeId,
          shortName: externalRouteId,
          longName: externalRouteId,
          isActive: true,
        },
      });

      const created = await (db as any).route.findUnique({
        where: {
          feedSourceId_externalRouteId: {
            feedSourceId: context.feedSourceId || '',
            externalRouteId,
          },
        },
        select: { id: true },
      });

      if (created) {
        routeMap.set(externalRouteId, created.id);
      }
    }
  }

  private async resolveAgencyId(
    context: ImportContext,
    db: unknown,
  ): Promise<string> {
    const existing = await (db as any).agency.findFirst({
      where: { regionId: context.regionId },
      select: { id: true },
    });
    if (existing) return existing.id;

    const operator = await (db as any).operator.findFirst({
      where: { regionId: context.regionId },
      select: { id: true },
    });
    const operatorId = operator?.id ?? context.operatorId;

    const region = await (db as any).region.findUnique({
      where: { id: context.regionId },
      select: { code: true, timezone: true, defaultLocale: true },
    });

    const created = await (db as any).agency.create({
      data: {
        regionId: context.regionId,
        operatorId,
        name: 'Unknown Agency',
        slug: `unknown-${region?.code ?? context.regionId.slice(0, 8)}`,
        timezone: region?.timezone ?? 'Asia/Jakarta',
        language: region?.defaultLocale ?? 'id',
      },
    });
    return created.id;
  }

  private async resolveTransitModeId(db: unknown): Promise<string> {
    const existing = await (db as any).transitMode.findFirst({
      select: { id: true },
    });
    if (existing) return existing.id;

    const created = await (db as any).transitMode.create({
      data: { code: 'UNKNOWN', name: 'Unknown' },
    });
    return created.id;
  }

  private async bulkUpdatePostgis(
    context: ImportContext,
    db: unknown,
  ): Promise<void> {
    try {
      await (db as any).$executeRawUnsafe(
        'UPDATE gtfs_stops SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography WHERE location IS NULL AND feed_source_id = $1',
        context.feedSourceId || '',
      );
    } catch (error) {
      this.logger.warn(
        `PostGIS bulk update failed: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
    }
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

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}

function formatSqlValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object')
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
  return 'NULL';
}

function camelToSnake(value: string): string {
  return value.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}
