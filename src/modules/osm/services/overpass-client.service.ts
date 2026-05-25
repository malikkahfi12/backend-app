import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '@/config/app.config';

export interface OsmStopElement {
  type: 'node' | 'way';
  id: number;
  lat: number;
  lon: number;
  tags: Record<string, string>;
}

export interface OsmRouteRelation {
  type: 'relation';
  id: number;
  tags: Record<string, string>;
  members: OsmRouteRelationMember[];
}

export interface OsmRouteRelationMember {
  type: 'node' | 'way' | 'relation';
  ref: number;
  role: string;
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
  members?: Array<{
    type: 'node' | 'way' | 'relation';
    ref: number;
    role: string;
  }>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

const STOP_TAGS = [
  'railway=station',
  'railway=tram_stop',
  'public_transport=station',
  'highway=bus_stop',
];

const ROUTE_RELATION_TAGS: Record<string, string> = {
  train: 'train',
  subway: 'subway',
  light_rail: 'light_rail',
  tram: 'tram',
  bus: 'bus',
};

@Injectable()
export class OverpassClientService {
  private readonly logger = new Logger(OverpassClientService.name);
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(configService: ConfigService<AppConfig, true>) {
    this.baseUrl = configService.get('overpass.baseUrl', { infer: true });
    this.timeout = configService.get('overpass.timeout', { infer: true });
  }

  async queryStops(bbox: string): Promise<OsmStopElement[]> {
    const tagFilters = STOP_TAGS.map((tag) => `node[${tag}](${bbox});`).join(
      '\n',
    );

    const query = `
[out:json][timeout:${Math.floor(this.timeout / 1000)}];
(
${tagFilters}
);
out body;
`;

    this.logger.log(`Querying Overpass API for bbox: ${bbox}`);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Transitly/1.0',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(
          `Overpass API returned ${response.status}: ${await response.text().catch(() => 'unknown error')}`,
        );
      }

      const data = (await response.json()) as OverpassResponse;
      this.logger.log(`Overpass returned ${data.elements.length} elements`);

      return data.elements
        .filter(
          (el): el is OverpassElement & { lat: number; lon: number } =>
            el.type !== 'relation' &&
            el.lat !== undefined &&
            el.lon !== undefined,
        )
        .map((el) => ({
          type: el.type as 'node' | 'way',
          id: el.id,
          lat: el.lat,
          lon: el.lon,
          tags: el.tags ?? {},
        }));
    } finally {
      clearTimeout(timer);
    }
  }

  async queryRouteRelations(
    bbox: string,
    modes?: string[],
  ): Promise<OsmRouteRelation[]> {
    const activeModes = modes ?? Object.keys(ROUTE_RELATION_TAGS);
    const tagEntries = activeModes.filter((m) => ROUTE_RELATION_TAGS[m]);

    if (tagEntries.length === 0) return [];

    const tagFilters = tagEntries
      .map((m) => `rel[route=${ROUTE_RELATION_TAGS[m]}](${bbox});`)
      .join('\n');

    const query = `
[out:json][timeout:${Math.floor(this.timeout / 1000)}];
(
${tagFilters}
);
out body;
`;

    this.logger.log(
      `Querying Overpass route relations for bbox: ${bbox}, modes: ${tagEntries.join(', ')}`,
    );

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Transitly/1.0',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(
          `Overpass API returned ${response.status}: ${await response.text().catch(() => 'unknown error')}`,
        );
      }

      const data = (await response.json()) as OverpassResponse;
      this.logger.log(
        `Overpass returned ${data.elements.length} route relations`,
      );

      return data.elements
        .filter(
          (
            el,
          ): el is OverpassElement & {
            members: NonNullable<OverpassElement['members']>;
          } => el.type === 'relation' && Array.isArray(el.members),
        )
        .map((el) => ({
          type: 'relation' as const,
          id: el.id,
          tags: el.tags ?? {},
          members: el.members.map((m) => ({
            type: m.type,
            ref: m.ref,
            role: m.role,
          })),
        }));
    } finally {
      clearTimeout(timer);
    }
  }

  async queryWayGeometries(wayIds: number[]): Promise<Map<number, number[][]>> {
    const result = new Map<number, number[][]>();
    if (wayIds.length === 0) return result;

    const uniqueIds = [...new Set(wayIds)];
    const idChunks = chunkArray(uniqueIds, 500);

    for (const chunk of idChunks) {
      const idList = chunk.join(',');
      const query = `
[out:json][timeout:${Math.floor(this.timeout / 1000)}];
way(id:${idList});
out geom;
`;

      this.logger.log(`Querying Overpass for ${chunk.length} way geometries`);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
          'Accept': 'application/json',
          'User-Agent': 'Transitly/1.0',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
          body: `data=${encodeURIComponent(query)}`,
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Overpass API returned ${response.status}`);
        }

        const data = (await response.json()) as OverpassResponse;

        for (const el of data.elements) {
          if (el.type === 'way' && Array.isArray((el as any).geometry)) {
            const geom = (el as any).geometry as Array<{
              lat: number;
              lon: number;
            }>;
            const coords: number[][] = geom.map((p) => [p.lon, p.lat]);
            result.set(el.id, coords);
          }
        }
      } finally {
        clearTimeout(timer);
      }
    }

    return result;
  }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
