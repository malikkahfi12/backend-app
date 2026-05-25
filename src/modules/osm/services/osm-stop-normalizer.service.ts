import { Injectable } from '@nestjs/common';
import { OsmStopElement } from './overpass-client.service';
import type { CreateStopInput } from '@/modules/transit/core/stops/domain/repositories/stop.repository.interface';

@Injectable()
export class OsmStopNormalizerService {
  normalize(element: OsmStopElement, regionId: string): CreateStopInput | null {
    const name = element.tags.name?.trim();
    if (!name) return null;

    const lat = element.lat;
    const lon = element.lon;
    if (lat == null || lon == null || isNaN(lat) || isNaN(lon)) return null;

    const slug = generateOsmSlug(name, element.type, element.id);
    const mode = resolveMode(element.tags);
    const isStation = resolveIsStation(element.tags);

    return {
      regionId,
      name,
      slug,
      latitude: lat,
      longitude: lon,
      isStation,
      isActive: true,
      osmId: String(element.id),
      osmType: element.type,
      source: 'osm',
      mode,
      address: resolveAddress(element.tags),
      code: element.tags.ref ?? undefined,
      feedSourceId: null,
      externalStopId: null,
    };
  }
}

function generateOsmSlug(name: string, osmType: string, osmId: number): string {
  const slugified = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slugified}-osm-${osmType}-${osmId}`;
}

function resolveMode(tags: Record<string, string>): string | null {
  if (tags.railway === 'station') return 'rail';
  if (tags.railway === 'tram_stop') return 'tram';
  if (tags.public_transport === 'station') return 'public_transport';
  if (tags.highway === 'bus_stop') return 'bus';
  return null;
}

function resolveIsStation(tags: Record<string, string>): boolean {
  if (tags.railway === 'station') return true;
  if (tags.railway === 'tram_stop') return true;
  if (tags.public_transport === 'station') return true;
  return false;
}

function resolveAddress(tags: Record<string, string>): string | undefined {
  const parts: string[] = [];
  if (tags['addr:street']) {
    let street = tags['addr:street'];
    if (tags['addr:housenumber']) {
      street = `${tags['addr:housenumber']} ${street}`;
    }
    parts.push(street);
  }
  if (tags['addr:city']) parts.push(tags['addr:city']);
  if (tags['addr:postcode']) parts.push(tags['addr:postcode']);
  return parts.length > 0 ? parts.join(', ') : undefined;
}
