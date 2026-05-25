import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';

const ALL_CHECKS = [
  'few_stops',
  'missing_geometry',
  'duplicate_stops',
  'large_gaps',
  'geometry_too_short',
  'geometry_too_long',
  'unsupported_mode',
];

const LARGE_GAP_THRESHOLD_METERS = 5000;

const MIN_LENGTH_BY_MODE: Record<string, number> = {
  rail: 500,
  subway: 500,
  light_rail: 500,
  tram: 500,
  bus: 100,
};

const MAX_LENGTH_BY_MODE: Record<string, number> = {
  rail: 200000,
  subway: 200000,
  light_rail: 200000,
  tram: 200000,
  bus: 100000,
};

const DEFAULT_MIN_LENGTH = 300;
const DEFAULT_MAX_LENGTH = 150000;

interface QaIssue {
  routeId: string;
  routeName: string;
  osmId: string;
  transitMode: string;
  failedChecks: string[];
  details: Record<string, unknown>;
}

export interface QaReport {
  totalRoutesChecked: number;
  issues: QaIssue[];
}

export interface CleanupResponse {
  dryRun: boolean;
  duplicateStopsRemoved: number;
  routesDisabled: number;
  errors: string[];
}

@Injectable()
export class OsmQaService {
  private readonly logger = new Logger(OsmQaService.name);

  constructor(private readonly prismaService: PrismaService) {}

  async runQaChecks(
    regionId?: string,
    checks?: string[],
    mode?: string,
    isActive?: boolean,
  ): Promise<QaReport> {
    const activeChecks = checks ?? ALL_CHECKS;
    const issues = new Map<string, QaIssue>();

    const osmRoutes = await this.loadOsmRoutes(regionId, mode, isActive);
    const routesMap = new Map<
      string,
      { name: string; osmId: string; mode: string }
    >();
    for (const r of osmRoutes) {
      routesMap.set(r.id, {
        name: r.short_name,
        osmId: r.osm_id,
        mode: this.resolveTransitModeCode(r.transit_mode_code),
      });
    }

    if (activeChecks.includes('few_stops')) {
      await this.checkFewStops(regionId, issues, routesMap);
    }

    if (activeChecks.includes('missing_geometry')) {
      await this.checkMissingGeometry(regionId, issues, routesMap);
    }

    if (
      activeChecks.includes('duplicate_stops') ||
      activeChecks.includes('large_gaps')
    ) {
      await this.checkRouteStops(regionId, activeChecks, issues, routesMap);
    }

    if (
      activeChecks.includes('geometry_too_short') ||
      activeChecks.includes('geometry_too_long')
    ) {
      await this.checkGeometryLength(regionId, activeChecks, issues, routesMap);
    }

    if (activeChecks.includes('unsupported_mode')) {
      await this.checkUnsupportedMode(regionId, issues, routesMap);
    }

    return {
      totalRoutesChecked: osmRoutes.length,
      issues: [...issues.values()],
    };
  }

  async runCleanup(
    regionId: string | undefined,
    removeDuplicateStops: boolean | undefined,
    disableUnusable: boolean | undefined,
    dryRun: boolean | undefined,
    disabledChecks: string[] | undefined,
  ): Promise<CleanupResponse> {
    const result: CleanupResponse = {
      dryRun: dryRun ?? false,
      duplicateStopsRemoved: 0,
      routesDisabled: 0,
      errors: [],
    };

    if (removeDuplicateStops) {
      try {
        const removed = await this.cleanupDuplicateStops(
          regionId,
          result.dryRun,
        );
        result.duplicateStopsRemoved = removed;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Failed to remove duplicate stops: ${message}`);
      }
    }

    if (disableUnusable && disabledChecks && disabledChecks.length > 0) {
      try {
        const disabled = await this.disableUnusableRoutes(
          regionId,
          disabledChecks,
          result.dryRun,
        );
        result.routesDisabled = disabled;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Failed to disable routes: ${message}`);
      }
    }

    return result;
  }

  // --- Private: data loading ---

  private async loadOsmRoutes(
    regionId?: string,
    modeCode?: string,
    isActive?: boolean,
  ): Promise<
    Array<{
      id: string;
      short_name: string;
      osm_id: string;
      transit_mode_code: string;
    }>
  > {
    let query = `
      SELECT r.id, r.short_name, r.osm_id, tm.code AS transit_mode_code
      FROM gtfs_routes r
      JOIN ms_transit_modes tm ON r.transit_mode_id = tm.id
      WHERE r.source = 'osm'
    `;
    const params: unknown[] = [];
    let paramIdx = 1;

    if (regionId) {
      query += ` AND r.region_id = $${paramIdx++}`;
      params.push(regionId);
    }

    if (modeCode) {
      query += ` AND tm.code = $${paramIdx++}`;
      params.push(modeCode);
    }

    if (isActive !== undefined) {
      query += ` AND r.is_active = $${paramIdx++}`;
      params.push(isActive);
    }

    return await this.prismaService.$queryRawUnsafe(query, ...params);
  }

  private ensureIssue(
    routeId: string,
    issues: Map<string, QaIssue>,
    routesMap: Map<string, { name: string; osmId: string; mode: string }>,
  ): QaIssue {
    let issue = issues.get(routeId);
    if (!issue) {
      const route = routesMap.get(routeId);
      issue = {
        routeId,
        routeName: route?.name ?? '',
        osmId: route?.osmId ?? '',
        transitMode: route?.mode ?? '',
        failedChecks: [],
        details: {},
      };
      issues.set(routeId, issue);
    }
    return issue;
  }

  // --- Private: individual checks ---

  private async checkFewStops(
    regionId: string | undefined,
    issues: Map<string, QaIssue>,
    routesMap: Map<string, { name: string; osmId: string; mode: string }>,
  ): Promise<void> {
    let query = `
      SELECT rs.route_id, COUNT(*)::int AS stop_count
      FROM gtfs_route_stops rs
      JOIN gtfs_routes r ON r.id = rs.route_id AND r.source = 'osm'
    `;
    const params: unknown[] = [];
    let paramIdx = 1;

    if (regionId) {
      query += ` WHERE r.region_id = $${paramIdx++}`;
      params.push(regionId);
    }

    query += ` GROUP BY rs.route_id HAVING COUNT(*) < 2`;

    const rows = await this.prismaService.$queryRawUnsafe<
      Array<{ route_id: string; stop_count: number }>
    >(query, ...params);

    for (const row of rows) {
      const issue = this.ensureIssue(row.route_id, issues, routesMap);
      issue.failedChecks.push('few_stops');
      issue.details.few_stops = { stopCount: row.stop_count };
    }
  }

  private async checkMissingGeometry(
    regionId: string | undefined,
    issues: Map<string, QaIssue>,
    routesMap: Map<string, { name: string; osmId: string; mode: string }>,
  ): Promise<void> {
    let query = `
      SELECT r.id
      FROM gtfs_routes r
      WHERE r.source = 'osm' AND r.geometry IS NULL
    `;
    const params: unknown[] = [];
    let paramIdx = 1;

    if (regionId) {
      query += ` AND r.region_id = $${paramIdx++}`;
      params.push(regionId);
    }

    const rows = await this.prismaService.$queryRawUnsafe<
      Array<{ id: string }>
    >(query, ...params);

    for (const row of rows) {
      const issue = this.ensureIssue(row.id, issues, routesMap);
      issue.failedChecks.push('missing_geometry');
    }
  }

  private async checkRouteStops(
    regionId: string | undefined,
    activeChecks: string[],
    issues: Map<string, QaIssue>,
    routesMap: Map<string, { name: string; osmId: string; mode: string }>,
  ): Promise<void> {
    const routeStops = await this.loadOrderedRouteStops(regionId);

    const byRoute = new Map<
      string,
      Array<{
        stopId: string;
        stopName: string;
        stopSequence: number;
        lat: number;
        lng: number;
      }>
    >();

    for (const rs of routeStops) {
      if (!byRoute.has(rs.route_id)) {
        byRoute.set(rs.route_id, []);
      }
      byRoute.get(rs.route_id)!.push({
        stopId: rs.stop_id,
        stopName: rs.stop_name,
        stopSequence: rs.stop_sequence,
        lat: rs.latitude ?? 0,
        lng: rs.longitude ?? 0,
      });
    }

    for (const [routeId, stops] of byRoute) {
      if (activeChecks.includes('duplicate_stops')) {
        const dups: Array<{
          stopSequence: number;
          stopId: string;
          stopName: string;
        }> = [];

        for (let i = 1; i < stops.length; i++) {
          if (stops[i].stopId === stops[i - 1].stopId) {
            dups.push({
              stopSequence: stops[i].stopSequence,
              stopId: stops[i].stopId,
              stopName: stops[i].stopName,
            });
          }
        }

        if (dups.length > 0) {
          const issue = this.ensureIssue(routeId, issues, routesMap);
          issue.failedChecks.push('duplicate_stops');
          issue.details.duplicate_stops = dups;
        }
      }

      if (activeChecks.includes('large_gaps')) {
        const gaps: Array<{
          fromSequence: number;
          toSequence: number;
          fromStopName: string;
          toStopName: string;
          distanceMeters: number;
        }> = [];

        for (let i = 1; i < stops.length; i++) {
          const a = stops[i - 1];
          const b = stops[i];
          if (a.lat == null || a.lng == null || b.lat == null || b.lng == null)
            continue;

          const d = haversineMeters(a.lat, a.lng, b.lat, b.lng);
          if (d > LARGE_GAP_THRESHOLD_METERS) {
            gaps.push({
              fromSequence: a.stopSequence,
              toSequence: b.stopSequence,
              fromStopName: a.stopName,
              toStopName: b.stopName,
              distanceMeters: Math.round(d),
            });
          }
        }

        if (gaps.length > 0) {
          const issue = this.ensureIssue(routeId, issues, routesMap);
          issue.failedChecks.push('large_gaps');
          issue.details.large_gaps = gaps;
        }
      }
    }
  }

  private async checkGeometryLength(
    regionId: string | undefined,
    activeChecks: string[],
    issues: Map<string, QaIssue>,
    routesMap: Map<string, { name: string; osmId: string; mode: string }>,
  ): Promise<void> {
    let query = `
      SELECT r.id, tm.code AS transit_mode_code,
        ST_Length(r.geometry) AS length_m
      FROM gtfs_routes r
      JOIN ms_transit_modes tm ON r.transit_mode_id = tm.id
      WHERE r.source = 'osm' AND r.geometry IS NOT NULL
    `;
    const params: unknown[] = [];
    let paramIdx = 1;

    if (regionId) {
      query += ` AND r.region_id = $${paramIdx++}`;
      params.push(regionId);
    }

    const rows = await this.prismaService.$queryRawUnsafe<
      Array<{
        id: string;
        transit_mode_code: string;
        length_m: number;
      }>
    >(query, ...params);

    for (const row of rows) {
      const minLen =
        MIN_LENGTH_BY_MODE[row.transit_mode_code] ?? DEFAULT_MIN_LENGTH;
      const maxLen =
        MAX_LENGTH_BY_MODE[row.transit_mode_code] ?? DEFAULT_MAX_LENGTH;

      if (
        activeChecks.includes('geometry_too_short') &&
        row.length_m < minLen
      ) {
        const issue = this.ensureIssue(row.id, issues, routesMap);
        issue.failedChecks.push('geometry_too_short');
        issue.details.geometry_too_short = {
          lengthMeters: Math.round(row.length_m),
        };
      }

      if (activeChecks.includes('geometry_too_long') && row.length_m > maxLen) {
        const issue = this.ensureIssue(row.id, issues, routesMap);
        issue.failedChecks.push('geometry_too_long');
        issue.details.geometry_too_long = {
          lengthMeters: Math.round(row.length_m),
        };
      }
    }
  }

  private async checkUnsupportedMode(
    regionId: string | undefined,
    issues: Map<string, QaIssue>,
    routesMap: Map<string, { name: string; osmId: string; mode: string }>,
  ): Promise<void> {
    let query = `
      SELECT r.id, r.transit_mode_id AS "transitModeId"
      FROM gtfs_routes r
      LEFT JOIN ms_transit_modes tm ON r.transit_mode_id = tm.id
      WHERE r.source = 'osm' AND tm.id IS NULL
    `;
    const params: unknown[] = [];
    let paramIdx = 1;

    if (regionId) {
      query += ` AND r.region_id = $${paramIdx++}`;
      params.push(regionId);
    }

    const rows = await this.prismaService.$queryRawUnsafe<
      Array<{ id: string; transitModeId: string }>
    >(query, ...params);

    for (const row of rows) {
      const issue = this.ensureIssue(row.id, issues, routesMap);
      issue.failedChecks.push('unsupported_mode');
      issue.details.unsupported_mode = {
        transitModeId: row.transitModeId,
      };
    }
  }

  // --- Private: cleanup operations ---

  private async cleanupDuplicateStops(
    regionId: string | undefined,
    dryRun: boolean,
  ): Promise<number> {
    const routeStops = await this.loadOrderedRouteStops(regionId);

    const byRoute = new Map<
      string,
      Array<{ id: string; stopId: string; stopSequence: number }>
    >();
    for (const rs of routeStops) {
      if (!byRoute.has(rs.route_id)) {
        byRoute.set(rs.route_id, []);
      }
      byRoute.get(rs.route_id)!.push({
        id: rs.route_stop_id,
        stopId: rs.stop_id,
        stopSequence: rs.stop_sequence,
      });
    }

    let totalRemoved = 0;

    for (const [, stops] of byRoute) {
      const toDelete: string[] = [];
      const kept: typeof stops = [];

      for (let i = 0; i < stops.length; i++) {
        if (i > 0 && stops[i].stopId === stops[i - 1].stopId) {
          toDelete.push(stops[i].id);
        } else {
          kept.push(stops[i]);
        }
      }

      if (toDelete.length === 0) continue;

      if (!dryRun) {
        await this.prismaService.$transaction(async (tx) => {
          for (const id of toDelete) {
            await tx.routeStop.delete({ where: { id } });
          }

          for (let i = 0; i < kept.length; i++) {
            if (kept[i].stopSequence !== i + 1) {
              await tx.routeStop.update({
                where: { id: kept[i].id },
                data: { stopSequence: i + 1 },
              });
            }
          }
        });
      }

      totalRemoved += toDelete.length;
    }

    return totalRemoved;
  }

  private async disableUnusableRoutes(
    regionId: string | undefined,
    disabledChecks: string[],
    dryRun: boolean,
  ): Promise<number> {
    const report = await this.runQaChecks(regionId, disabledChecks);

    const routeIds = report.issues
      .filter((issue) =>
        disabledChecks.some((c) => issue.failedChecks.includes(c)),
      )
      .map((issue) => issue.routeId);

    if (routeIds.length === 0) return 0;

    if (!dryRun) {
      await this.prismaService.$executeRawUnsafe(
        `UPDATE gtfs_routes SET is_active = false WHERE id = ANY($1::uuid[]) AND source = 'osm'`,
        routeIds,
      );
    }

    return routeIds.length;
  }

  // --- Private: data load helpers ---

  private async loadOrderedRouteStops(regionId?: string): Promise<
    Array<{
      route_id: string;
      route_stop_id: string;
      stop_id: string;
      stop_name: string;
      stop_sequence: number;
      latitude: number | null;
      longitude: number | null;
    }>
  > {
    let query = `
      SELECT
        rs.route_id,
        rs.id AS route_stop_id,
        rs.stop_id,
        s.name AS stop_name,
        rs.stop_sequence,
        s.latitude,
        s.longitude
      FROM gtfs_route_stops rs
      JOIN gtfs_routes r ON r.id = rs.route_id AND r.source = 'osm'
      JOIN gtfs_stops s ON s.id = rs.stop_id
    `;
    const params: unknown[] = [];
    let paramIdx = 1;

    if (regionId) {
      query += ` WHERE r.region_id = $${paramIdx++}`;
      params.push(regionId);
    }

    query += ` ORDER BY rs.route_id, rs.stop_sequence`;

    return await this.prismaService.$queryRawUnsafe(query, ...params);
  }

  private resolveTransitModeCode(code: string | null): string {
    return code ?? 'unknown';
  }
}

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
