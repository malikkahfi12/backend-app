import { Injectable } from '@nestjs/common';
import { OsmRouteRelation } from './overpass-client.service';
import type { CreateRouteInput } from '@/modules/transit/core/routes/domain/repositories/route.repository.interface';

export interface NormalizedOsmRoute {
  route: CreateRouteInput;
  stopOsmIds: Array<{
    osmId: string;
    osmType: string;
  }>;
  wayRefs: number[];
}

const OSM_MODE_TO_TRANSIT_MODE: Record<string, string> = {
  train: 'rail',
  subway: 'subway',
  light_rail: 'light_rail',
  tram: 'tram',
  bus: 'bus',
};

const VALID_STOP_ROLES = new Set([
  'stop',
  'platform',
  'station',
  'stop_position',
  '',
]);

@Injectable()
export class OsmRouteNormalizerService {
  normalize(
    relation: OsmRouteRelation,
    agencyId: string,
    transitModeId: string,
    regionId: string,
  ): NormalizedOsmRoute | null {
    const tags = relation.tags;

    const name = tags.name?.trim();
    if (!name) return null;

    const ref = tags.ref?.trim();
    const from = tags.from?.trim();
    const to = tags.to?.trim();

    const shortName = ref || name;
    let longName = name;
    if (from && to) {
      longName = `${from} – ${to}`;
    } else if (from) {
      longName = from;
    } else if (to) {
      longName = to;
    }

    const stopMembers = relation.members.filter(
      (m) => m.type === 'node' && VALID_STOP_ROLES.has(m.role),
    );

    const stopOsmIds = stopMembers.map((m) => ({
      osmId: String(m.ref),
      osmType: 'node',
    }));

    const wayRefs = relation.members
      .filter(
        (m) =>
          m.type === 'way' &&
          (m.role === '' || m.role === 'forward' || m.role === 'backward'),
      )
      .map((m) => m.ref);

    const route: CreateRouteInput = {
      agencyId,
      transitModeId,
      shortName,
      longName,
      isActive: true,
      osmId: String(relation.id),
      osmType: 'relation',
      source: 'osm',
      regionId,
    };

    if (tags.colour || tags.color) {
      route.color = (tags.colour || tags.color).replace(/^#/, '');
    }

    if (tags.description) {
      route.description = tags.description;
    }

    return { route, stopOsmIds, wayRefs };
  }
}

export function osmRouteModeToTransitModeCode(osmMode: string): string | null {
  return OSM_MODE_TO_TRANSIT_MODE[osmMode] ?? null;
}

export function getOsmRouteModes(): string[] {
  return Object.keys(OSM_MODE_TO_TRANSIT_MODE);
}
