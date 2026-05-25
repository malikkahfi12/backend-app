import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { OverpassClientService } from './overpass-client.service';
import {
  OsmRouteNormalizerService,
  osmRouteModeToTransitModeCode,
} from './osm-route-normalizer.service';
import { OsmRouteGeometryService } from './osm-route-geometry.service';

export interface OsmRouteImportResponse {
  totalRelations: number;
  importedRoutes: number;
  skippedRoutes: number;
  createdRouteStops: number;
  unmatchedStops: number;
  errors: string[];
}

export interface OsmRouteShapeImportResponse {
  totalRoutes: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: string[];
}

interface TransitModeMap {
  [code: string]: string;
}

@Injectable()
export class OsmRouteImportService {
  private readonly logger = new Logger(OsmRouteImportService.name);

  constructor(
    private readonly overpassClient: OverpassClientService,
    private readonly normalizer: OsmRouteNormalizerService,
    private readonly geometryService: OsmRouteGeometryService,
    private readonly prismaService: PrismaService,
  ) {}

  async importRoutes(
    regionId: string,
    bbox: string,
    modes?: string[],
  ): Promise<OsmRouteImportResponse> {
    const result: OsmRouteImportResponse = {
      totalRelations: 0,
      importedRoutes: 0,
      skippedRoutes: 0,
      createdRouteStops: 0,
      unmatchedStops: 0,
      errors: [],
    };

    const transitModeMap = await this.loadTransitModes(modes);
    if (result.errors.length > 0) return result;

    const agencyId = await this.ensureOsmAgency(regionId);
    if (!agencyId) {
      result.errors.push('Failed to create OSM agency');
      return result;
    }

    let relations;
    try {
      relations = await this.overpassClient.queryRouteRelations(bbox, modes);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Failed to fetch from Overpass: ${message}`);
      return result;
    }

    result.totalRelations = relations.length;

    for (const relation of relations) {
      try {
        const osmMode = relation.tags.route;
        const transitModeCode = osmRouteModeToTransitModeCode(osmMode);
        if (!transitModeCode) {
          result.skippedRoutes++;
          continue;
        }

        const transitModeId = transitModeMap[transitModeCode];
        if (!transitModeId) {
          result.skippedRoutes++;
          continue;
        }

        const normalized = this.normalizer.normalize(
          relation,
          agencyId,
          transitModeId,
          regionId,
        );

        if (!normalized) {
          result.skippedRoutes++;
          continue;
        }

        if (normalized.stopOsmIds.length < 2) {
          result.skippedRoutes++;
          continue;
        }

        const matchedStops = await this.matchStops(normalized.stopOsmIds);

        result.unmatchedStops +=
          normalized.stopOsmIds.length - matchedStops.length;

        if (matchedStops.length < 2) {
          result.skippedRoutes++;
          continue;
        }

        const route = await this.prismaService.route.upsert({
          where: {
            osmId_osmType: {
              osmId: normalized.route.osmId!,
              osmType: normalized.route.osmType!,
            },
          },
          update: {
            shortName: normalized.route.shortName,
            longName: normalized.route.longName,
            description: normalized.route.description,
            color: normalized.route.color,
          },
          create: normalized.route as any,
        });

        const dedupedStops = deduplicateStopIds(matchedStops);

        const routeStops = dedupedStops.map((stopId, index) => ({
          routeId: route.id,
          stopId,
          stopSequence: index + 1,
        }));

        await this.prismaService.$transaction(async (tx) => {
          await tx.routeStop.deleteMany({ where: { routeId: route.id } });
          await tx.routeStop.createMany({ data: routeStops });
        });

        result.createdRouteStops += routeStops.length;
        result.importedRoutes++;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(
          `Failed to import relation/${relation.id}: ${message}`,
        );
      }
    }

    this.logger.log(
      `OSM route import complete: relations=${result.totalRelations} imported=${result.importedRoutes} skipped=${result.skippedRoutes} stops=${result.createdRouteStops}`,
    );

    return result;
  }

  private async loadTransitModes(modes?: string[]): Promise<TransitModeMap> {
    const transitModeMap: TransitModeMap = {};
    const uniqueCodes = new Set<string>();

    if (modes) {
      for (const m of modes) {
        const code = osmRouteModeToTransitModeCode(m);
        if (code) uniqueCodes.add(code);
      }
    } else {
      for (const code of ['rail', 'subway', 'light_rail', 'tram', 'bus']) {
        uniqueCodes.add(code);
      }
    }

    if (uniqueCodes.size === 0) return {};

    const transitModes = await this.prismaService.transitMode.findMany({
      where: { code: { in: [...uniqueCodes] } },
    });

    for (const tm of transitModes) {
      transitModeMap[tm.code] = tm.id;
    }

    for (const code of uniqueCodes) {
      if (!transitModeMap[code]) {
        this.logger.warn(
          `TransitMode '${code}' not found. Create it first via POST /transit-modes`,
        );
      }
    }

    return transitModeMap;
  }

  private async ensureOsmAgency(regionId: string): Promise<string | null> {
    const region = await this.prismaService.region.findUnique({
      where: { id: regionId },
    });

    if (!region) {
      this.logger.warn(`Region ${regionId} not found`);
      return null;
    }

    const operator = await this.prismaService.operator.upsert({
      where: {
        regionId_code: {
          regionId,
          code: 'osm',
        },
      },
      update: {},
      create: {
        regionId,
        code: 'osm',
        name: 'OpenStreetMap',
        type: 'COMMUNITY',
      },
    });

    const slug = `osm-${region.code}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const agency = await this.prismaService.agency.upsert({
      where: { regionId_slug: { regionId, slug } },
      update: {},
      create: {
        regionId,
        operatorId: operator.id,
        name: 'OpenStreetMap',
        slug,
        timezone: region.timezone,
        language: region.defaultLocale,
      },
    });

    return agency.id;
  }

  private async matchStops(
    stopOsmIds: Array<{ osmId: string; osmType: string }>,
  ): Promise<string[]> {
    if (stopOsmIds.length === 0) return [];

    const conditions = stopOsmIds.map(
      (s) => `(osm_id = '${s.osmId}' AND osm_type = '${s.osmType}')`,
    );

    const rows = await this.prismaService.$queryRawUnsafe<
      Array<{ id: string; osm_id: string }>
    >(`SELECT id, osm_id FROM gtfs_stops WHERE (${conditions.join(' OR ')})`);

    const osmIdToStopId = new Map<string, string>();
    for (const row of rows) {
      osmIdToStopId.set(row.osm_id, row.id);
    }

    const result: string[] = [];
    for (const s of stopOsmIds) {
      const stopId = osmIdToStopId.get(s.osmId);
      if (stopId) result.push(stopId);
    }

    return result;
  }

  async importRouteShapes(
    regionId: string,
    bbox: string,
    modes?: string[],
  ): Promise<OsmRouteShapeImportResponse> {
    const result: OsmRouteShapeImportResponse = {
      totalRoutes: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    const relations = await this.overpassClient.queryRouteRelations(
      bbox,
      modes,
    );
    result.totalRoutes = relations.length;

    const allWayRefs = new Set<number>();
    for (const rel of relations) {
      for (const m of rel.members) {
        if (m.type === 'way') allWayRefs.add(m.ref);
      }
    }

    const wayGeometries = await this.overpassClient.queryWayGeometries([
      ...allWayRefs,
    ]);

    for (const relation of relations) {
      try {
        const transitModeCode = osmRouteModeToTransitModeCode(
          relation.tags.route,
        );
        if (!transitModeCode) {
          result.skipped++;
          continue;
        }

        const route = await this.prismaService.route.findFirst({
          where: {
            osmId: String(relation.id),
            osmType: 'relation',
            source: 'osm',
          },
          select: { id: true },
        });

        if (!route) {
          result.skipped++;
          continue;
        }

        const wayRefs = relation.members
          .filter(
            (m) =>
              m.type === 'way' &&
              (m.role === '' || m.role === 'forward' || m.role === 'backward'),
          )
          .map((m) => m.ref);

        let geometry: number[][] | null = null;

        if (wayRefs.length > 0) {
          geometry = this.geometryService.buildGeometry(wayRefs, wayGeometries);
        }

        if (!geometry) {
          const routeStops = await this.prismaService.routeStop.findMany({
            where: { routeId: route.id },
            orderBy: { stopSequence: 'asc' },
            include: { stop: { select: { latitude: true, longitude: true } } },
          });

          if (routeStops.length >= 2) {
            geometry = this.geometryService.buildFromStopCoords(
              routeStops.map((rs) => ({
                lat: (rs.stop as any).latitude as number,
                lng: (rs.stop as any).longitude as number,
              })),
            );
          }
        }

        if (!geometry || geometry.length < 2) {
          result.skipped++;
          continue;
        }

        const coords = geometry.map(([lng, lat]) => `${lng} ${lat}`).join(',');
        const wkt = `LINESTRING(${coords})`;

        await this.prismaService.$executeRawUnsafe(
          `UPDATE gtfs_routes
           SET geometry = ST_SetSRID(ST_GeomFromText($1, 4326), 4326)::geography
           WHERE id = $2`,
          wkt,
          route.id,
        );

        result.updated++;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(
          `Failed geometry for rel/${relation.id}: ${message}`,
        );
        result.failed++;
      }
    }

    this.logger.log(
      `OSM route shape import complete: total=${result.totalRoutes} updated=${result.updated} skipped=${result.skipped} failed=${result.failed}`,
    );

    return result;
  }
}

function deduplicateStopIds(stopIds: string[]): string[] {
  const seen = new Set<string>();
  return stopIds.filter((id) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}
