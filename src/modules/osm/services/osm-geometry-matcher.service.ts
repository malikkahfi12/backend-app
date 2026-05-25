import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { GeometryQualityService } from './geometry-quality.service';

export interface MatchCandidate {
  gtfsRouteId: string;
  osmRouteId: string;
  score: number;
  details: {
    nameScore: number;
    modeScore: number;
    stopOverlapScore: number;
    geometryProximityScore: number;
    directionScore: number;
  };
}

export interface MatchResult {
  totalGtfsRoutes: number;
  matched: number;
  skipped: number;
  lowConfidence: number;
  replacedGeometryCount: number;
  details: MatchCandidate[];
  errors: string[];
}

const CONFIDENCE_THRESHOLD = 50;
const STOP_PROXIMITY_METERS = 300;

@Injectable()
export class OsmGeometryMatcherService {
  private readonly logger = new Logger(OsmGeometryMatcherService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly qualityService: GeometryQualityService,
  ) {}

  async matchGtfsGeometry(
    regionId: string,
    confidenceThreshold: number | undefined,
    dryRun: boolean,
    replaceLowQuality: boolean,
  ): Promise<MatchResult> {
    const threshold = confidenceThreshold ?? CONFIDENCE_THRESHOLD;
    const result: MatchResult = {
      totalGtfsRoutes: 0,
      matched: 0,
      skipped: 0,
      lowConfidence: 0,
      replacedGeometryCount: 0,
      details: [],
      errors: [],
    };

    const gtfsRoutes = await this.loadGtfsRoutes(regionId);
    const osmRoutes = await this.loadOsmRoutes(regionId);

    result.totalGtfsRoutes = gtfsRoutes.length;

    if (osmRoutes.length === 0) {
      result.skipped = gtfsRoutes.length;
      return result;
    }

    for (const gtfs of gtfsRoutes) {
      try {
        if (replaceLowQuality) {
          const shapeQuality = await this.assessGtfsShapeQuality(gtfs.id);
          if (shapeQuality && shapeQuality.isGood) {
            result.skipped++;
            continue;
          }
        }

        let bestCandidate: MatchCandidate | null = null;

        for (const osm of osmRoutes) {
          if (gtfs.transit_mode_code !== osm.transit_mode_code) continue;

          const candidate = this.scoreMatch(gtfs, osm);
          if (!bestCandidate || candidate.score > bestCandidate.score) {
            bestCandidate = candidate;
          }
        }

        if (!bestCandidate) {
          result.skipped++;
          continue;
        }

        if (bestCandidate.score < threshold) {
          result.lowConfidence++;
          result.details.push(bestCandidate);
          continue;
        }

        if (!dryRun) {
          await this.applyMatch(
            bestCandidate.gtfsRouteId,
            bestCandidate.osmRouteId,
            bestCandidate.score,
          );
        }

        result.matched++;
        result.replacedGeometryCount++;
        result.details.push(bestCandidate);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Failed to match GTFS route ${gtfs.id}: ${message}`);
      }
    }

    this.logger.log(
      `Geometry fusion complete: total=${result.totalGtfsRoutes} matched=${result.matched} skipped=${result.skipped} lowConf=${result.lowConfidence}`,
    );

    return result;
  }

  private scoreMatch(gtfs: GtfsRouteInfo, osm: OsmRouteInfo): MatchCandidate {
    const nameScore = this.scoreNames(gtfs, osm);
    const modeScore = gtfs.transit_mode_code === osm.transit_mode_code ? 20 : 0;
    const stopOverlapScore = this.scoreStopOverlap(gtfs.stopIds, osm.stopIds);
    const geometryProximityScore = 0;
    const directionScore = 0;

    const score =
      nameScore +
      modeScore +
      stopOverlapScore +
      geometryProximityScore +
      directionScore;

    return {
      gtfsRouteId: gtfs.id,
      osmRouteId: osm.id,
      score,
      details: {
        nameScore,
        modeScore,
        stopOverlapScore,
        geometryProximityScore,
        directionScore,
      },
    };
  }

  private scoreNames(gtfs: GtfsRouteInfo, osm: OsmRouteInfo): number {
    const shortScore = this.similarityScore(
      normalizeName(gtfs.short_name),
      normalizeName(osm.short_name),
    );
    const longScore = this.similarityScore(
      normalizeName(gtfs.long_name),
      normalizeName(osm.long_name),
    );
    return Math.round(shortScore * 15 + longScore * 15);
  }

  private similarityScore(a: string, b: string): number {
    if (a === b) return 1;
    if (!a || !b) return 0;

    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();

    if (aLower === bLower) return 1;
    if (aLower.includes(bLower) || bLower.includes(aLower)) return 0.8;

    const dist = levenshteinDistance(aLower, bLower);
    const maxLen = Math.max(aLower.length, bLower.length);
    if (maxLen === 0) return 0;

    return 1 - dist / maxLen;
  }

  private scoreStopOverlap(
    gtfsStopIds: string[],
    osmStopIds: string[],
  ): number {
    if (gtfsStopIds.length === 0 && osmStopIds.length === 0) return 0;
    if (gtfsStopIds.length === 0 || osmStopIds.length === 0) return 0;

    const gtfsSet = new Set(gtfsStopIds);
    let overlap = 0;
    for (const id of osmStopIds) {
      if (gtfsSet.has(id)) overlap++;
    }

    const union = new Set([...gtfsStopIds, ...osmStopIds]).size;
    if (union === 0) return 0;

    return Math.round((overlap / union) * 25);
  }

  private async assessGtfsShapeQuality(
    routeId: string,
  ): Promise<{ isGood: boolean } | null> {
    const rows = await this.prismaService.$queryRawUnsafe<
      Array<{
        shape_pt_lat: number;
        shape_pt_lon: number;
      }>
    >(
      `SELECT sp.shape_pt_lat, sp.shape_pt_lon
       FROM gtfs_shapes sp
       JOIN gtfs_trips t ON t.feed_source_id = sp.feed_source_id
         AND t.external_shape_id = sp.external_shape_id
       WHERE t.route_id = $1
       ORDER BY sp.shape_pt_sequence
       LIMIT 2000`,
      routeId,
    );

    if (rows.length === 0) return null;

    const coords = rows.map(
      (r) => [r.shape_pt_lon, r.shape_pt_lat] as [number, number],
    );
    const quality = this.qualityService.assess(coords);

    return { isGood: quality?.isGood ?? false };
  }

  private async loadGtfsRoutes(regionId: string): Promise<GtfsRouteInfo[]> {
    const routes = await this.prismaService.$queryRawUnsafe<
      Array<{
        id: string;
        short_name: string;
        long_name: string;
        transit_mode_code: string;
      }>
    >(
      `SELECT r.id, r.short_name, r.long_name, tm.code AS transit_mode_code
       FROM gtfs_routes r
       JOIN ms_transit_modes tm ON r.transit_mode_id = tm.id
       WHERE r.source = 'gtfs' AND r.region_id = $1`,
      regionId,
    );

    const result: GtfsRouteInfo[] = [];
    for (const r of routes) {
      const stopIds = await this.loadGtfsRouteStopIds(r.id);
      result.push({ ...r, stopIds });
    }
    return result;
  }

  private async loadOsmRoutes(regionId: string): Promise<OsmRouteInfo[]> {
    const routes = await this.prismaService.$queryRawUnsafe<
      Array<{
        id: string;
        short_name: string;
        long_name: string;
        transit_mode_code: string;
      }>
    >(
      `SELECT r.id, r.short_name, r.long_name, tm.code AS transit_mode_code
       FROM gtfs_routes r
       JOIN ms_transit_modes tm ON r.transit_mode_id = tm.id
       WHERE r.source = 'osm' AND r.region_id = $1`,
      regionId,
    );

    const result: OsmRouteInfo[] = [];
    for (const r of routes) {
      const stopIds = await this.loadOsmRouteStopIds(r.id);
      result.push({ ...r, stopIds });
    }
    return result;
  }

  private async loadGtfsRouteStopIds(routeId: string): Promise<string[]> {
    const rows = await this.prismaService.$queryRawUnsafe<
      Array<{ stop_id: string }>
    >(
      `SELECT DISTINCT st.stop_id
       FROM gtfs_stop_times st
       JOIN gtfs_trips t ON t.id = st.trip_id
       WHERE t.route_id = $1`,
      routeId,
    );
    return rows.map((r) => r.stop_id);
  }

  private async loadOsmRouteStopIds(routeId: string): Promise<string[]> {
    const rows = await this.prismaService.$queryRawUnsafe<
      Array<{ stop_id: string }>
    >(
      `SELECT stop_id FROM gtfs_route_stops WHERE route_id = $1 ORDER BY stop_sequence`,
      routeId,
    );
    return rows.map((r) => r.stop_id);
  }

  private async applyMatch(
    gtfsRouteId: string,
    osmRouteId: string,
    score: number,
  ): Promise<void> {
    await this.prismaService.$executeRawUnsafe(
      `UPDATE gtfs_routes
       SET matched_osm_route_id = $1,
           geometry_source = 'osm',
           geometry_confidence_score = $2
       WHERE id = $3`,
      osmRouteId,
      score,
      gtfsRouteId,
    );
  }
}

interface GtfsRouteInfo {
  id: string;
  short_name: string;
  long_name: string;
  transit_mode_code: string;
  stopIds: string[];
}

interface OsmRouteInfo {
  id: string;
  short_name: string;
  long_name: string;
  transit_mode_code: string;
  stopIds: string[];
}

function normalizeName(value: string): string {
  return value?.toLowerCase().trim().replace(/\s+/g, ' ') ?? '';
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  const curr = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      curr[j] =
        a[i - 1] === b[j - 1]
          ? prev[j - 1]
          : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}
