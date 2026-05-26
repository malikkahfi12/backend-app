import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '@/config/app.config';

interface MapTilerFeature {
  type: 'Feature';
  id: string;
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: Record<string, unknown>;
  place_name: string;
  center: [number, number];
}

interface MapTilerGeocodingResponse {
  type: 'FeatureCollection';
  features: MapTilerFeature[];
}

export interface NormalizedPlaceResult {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  type: string;
  provider: string;
}

export interface NormalizedReverseResult {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  provider: string;
}

const TIMEOUT_MS = 10_000;

const REGIONAL_BBOX_DEGREES = 1.0;

@Injectable()
export class MaptilerGeocodingService {
  private readonly logger = new Logger(MaptilerGeocodingService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(configService: ConfigService<AppConfig, true>) {
    this.apiKey = configService.get('maptiler.apiKey', { infer: true });
    this.baseUrl = configService.get('maptiler.geocodingBaseUrl', {
      infer: true,
    });
  }

  async search(
    query: string,
    opts?: { lat?: number; lng?: number; limit?: number },
  ): Promise<NormalizedPlaceResult[]> {
    const limit = opts?.limit ?? 5;
    const fetchLimit = limit * 2;
    const params = new URLSearchParams({
      key: this.apiKey,
      limit: String(fetchLimit),
    });

    if (opts?.lng !== undefined && opts?.lat !== undefined) {
      params.set('proximity', `${opts.lng},${opts.lat}`);

      const minLng = opts.lng - REGIONAL_BBOX_DEGREES;
      const minLat = opts.lat - REGIONAL_BBOX_DEGREES;
      const maxLng = opts.lng + REGIONAL_BBOX_DEGREES;
      const maxLat = opts.lat + REGIONAL_BBOX_DEGREES;
      params.set('bbox', `${minLng},${minLat},${maxLng},${maxLat}`);
    }

    const url = `${this.baseUrl}/geocoding/${encodeURIComponent(query)}.json?${params.toString()}`;

    this.logger.log(`Geocoding search: "${query}" (limit=${limit})`);

    const data = await this.fetchWithTimeout(url);

    if (!data || !data.features || data.features.length === 0) {
      this.logger.log(`No results for query: "${query}"`);
      return [];
    }

    return data.features
      .map((f) => this.normalizeSearchResult(f))
      .filter(
        (r, i, arr) =>
          arr.findIndex(
            (p) => p.name.toLowerCase() === r.name.toLowerCase(),
          ) === i,
      )
      .slice(0, limit);
  }

  async reverse(
    lat: number,
    lng: number,
  ): Promise<NormalizedReverseResult | null> {
    const params = new URLSearchParams({ key: this.apiKey });
    const url = `${this.baseUrl}/geocoding/${lng},${lat}.json?${params.toString()}`;

    this.logger.log(`Reverse geocoding: (${lat}, ${lng})`);

    const data = await this.fetchWithTimeout(url);

    if (!data || !data.features || data.features.length === 0) {
      this.logger.log(`No results for reverse: (${lat}, ${lng})`);
      return null;
    }

    return this.normalizeReverseResult(data.features[0]);
  }

  private normalizeSearchResult(f: MapTilerFeature): NormalizedPlaceResult {
    const [lng, lat] = f.center;
    const name =
      (f.properties?.['name'] as string) ??
      f.place_name?.split(',')[0]?.trim() ??
      'Unknown';
    const placeType =
      (Array.isArray(f.properties?.['place_type'])
        ? String((f.properties?.['place_type'] as string[])[0])
        : 'place') || 'place';

    return {
      id: `place:${f.id ?? ''}`,
      name,
      address: f.place_name ?? '',
      latitude: lat,
      longitude: lng,
      type: placeType,
      provider: 'maptiler',
    };
  }

  private normalizeReverseResult(f: MapTilerFeature): NormalizedReverseResult {
    const [lng, lat] = f.center;
    const name =
      (f.properties?.['name'] as string) ??
      f.place_name?.split(',')[0]?.trim() ??
      'Unknown';

    return {
      name,
      address: f.place_name ?? '',
      latitude: lat,
      longitude: lng,
      provider: 'maptiler',
    };
  }

  private async fetchWithTimeout(
    url: string,
  ): Promise<MapTilerGeocodingResponse | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
      });

      if (!response.ok) {
        this.logger.error(
          `MapTiler API returned ${response.status}: ${await response.text().catch(() => 'unknown error')}`,
        );
        return null;
      }

      return (await response.json()) as MapTilerGeocodingResponse;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        this.logger.error(
          `MapTiler API request timed out after ${TIMEOUT_MS}ms`,
        );
      } else {
        this.logger.error(
          `MapTiler API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}
