import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '@/config/app.config';
import { RedisService } from '@/infrastructure/redis/redis.service';

interface StadiaMapsFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: Record<string, unknown>;
}

interface StadiaMapsGeocodingResponse {
  type: 'FeatureCollection';
  features: StadiaMapsFeature[];
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

const GEOCODE_CACHE_TTL_SECONDS = 86_400;

@Injectable()
export class StadiaMapsGeocodingService {
  private readonly logger = new Logger(StadiaMapsGeocodingService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(
    configService: ConfigService<AppConfig, true>,
    private readonly redis: RedisService,
  ) {
    this.apiKey = configService.get('stadiamaps.apiKey', { infer: true });
    this.baseUrl = configService.get('stadiamaps.baseUrl', {
      infer: true,
    });
  }

  async search(
    query: string,
    opts?: { lat?: number; lng?: number; limit?: number; lang?: string },
  ): Promise<NormalizedPlaceResult[]> {
    const limit = opts?.limit ?? 5;
    const fetchLimit = limit + 2;
    const params = new URLSearchParams({
      api_key: this.apiKey,
      text: query,
      size: String(fetchLimit),
    });

    if (opts?.lang) {
      params.set('lang', opts.lang);
    }

    if (opts?.lng !== undefined && opts?.lat !== undefined) {
      params.set('focus.point.lon', String(opts.lng));
      params.set('focus.point.lat', String(opts.lat));

      const minLng = opts.lng - REGIONAL_BBOX_DEGREES;
      const minLat = opts.lat - REGIONAL_BBOX_DEGREES;
      const maxLng = opts.lng + REGIONAL_BBOX_DEGREES;
      const maxLat = opts.lat + REGIONAL_BBOX_DEGREES;
      params.set('boundary.rect.min_lon', String(minLng));
      params.set('boundary.rect.max_lon', String(maxLng));
      params.set('boundary.rect.min_lat', String(minLat));
      params.set('boundary.rect.max_lat', String(maxLat));
    }

    const cacheKey = `stadiamaps:geocode:search:${query.trim().toLowerCase()}:${(opts?.lat ?? 0).toFixed(3)}:${(opts?.lng ?? 0).toFixed(3)}:${limit}:${opts?.lang ?? ''}`;

    try {
      const cached = await this.redis.get<NormalizedPlaceResult[]>(cacheKey);
      if (cached !== null) {
        this.logger.log(`Cache HIT for search: "${query}" (limit=${limit})`);
        return cached;
      }
    } catch {
      this.logger.warn(
        `Redis get failed for search cache, falling through to API`,
      );
    }

    const url = `${this.baseUrl}/geocoding/v1/search?${params.toString()}`;

    this.logger.log(`Geocoding search: "${query}" (limit=${limit})`);

    const data = await this.fetchWithTimeout(url);

    if (!data || !data.features || data.features.length === 0) {
      this.logger.log(`No results for query: "${query}"`);
      return [];
    }

    const results = data.features
      .map((f) => this.normalizeSearchResult(f))
      .filter(
        (r, i, arr) =>
          arr.findIndex(
            (p) => p.name.toLowerCase() === r.name.toLowerCase(),
          ) === i,
      )
      .slice(0, limit);

    try {
      await this.redis.set(cacheKey, results, GEOCODE_CACHE_TTL_SECONDS);
    } catch {
      this.logger.warn(`Redis set failed for search cache`);
    }

    return results;
  }

  async reverse(
    lat: number,
    lng: number,
  ): Promise<NormalizedReverseResult | null> {
    const cacheKey = `stadiamaps:geocode:reverse:${lat.toFixed(5)}:${lng.toFixed(5)}`;

    try {
      const cached = await this.redis.get<NormalizedReverseResult>(cacheKey);
      if (cached !== null) {
        this.logger.log(`Cache HIT for reverse: (${lat}, ${lng})`);
        return cached;
      }
    } catch {
      this.logger.warn(
        `Redis get failed for reverse cache, falling through to API`,
      );
    }

    const params = new URLSearchParams({
      api_key: this.apiKey,
      'point.lat': String(lat),
      'point.lon': String(lng),
    });
    const url = `${this.baseUrl}/geocoding/v1/reverse?${params.toString()}`;

    this.logger.log(`Reverse geocoding: (${lat}, ${lng})`);

    const data = await this.fetchWithTimeout(url);

    if (!data || !data.features || data.features.length === 0) {
      this.logger.log(`No results for reverse: (${lat}, ${lng})`);
      return null;
    }

    const result = this.normalizeReverseResult(data.features[0]);

    try {
      await this.redis.set(cacheKey, result, GEOCODE_CACHE_TTL_SECONDS);
    } catch {
      this.logger.warn(`Redis set failed for reverse cache`);
    }

    return result;
  }

  private normalizeSearchResult(f: StadiaMapsFeature): NormalizedPlaceResult {
    const [lng, lat] = f.geometry.coordinates;
    const props = f.properties ?? {};
    const name = (props.name as string) ?? 'Unknown';
    const address =
      (props.formatted_address_line as string) ?? (props.label as string) ?? '';
    const type = (props.layer as string) ?? 'place';

    return {
      id: `place:${(props.gid as string) ?? ''}`,
      name,
      address,
      latitude: lat,
      longitude: lng,
      type,
      provider: 'stadiamaps',
    };
  }

  private normalizeReverseResult(
    f: StadiaMapsFeature,
  ): NormalizedReverseResult {
    const [lng, lat] = f.geometry.coordinates;
    const props = f.properties ?? {};
    const name = (props.name as string) ?? 'Unknown';
    const address =
      (props.formatted_address_line as string) ?? (props.label as string) ?? '';

    return {
      name,
      address,
      latitude: lat,
      longitude: lng,
      provider: 'stadiamaps',
    };
  }

  private async fetchWithTimeout(
    url: string,
  ): Promise<StadiaMapsGeocodingResponse | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
      });

      if (!response.ok) {
        this.logger.error(
          `Stadia Maps API returned ${response.status}: ${await response.text().catch(() => 'unknown error')}`,
        );
        return null;
      }

      return (await response.json()) as StadiaMapsGeocodingResponse;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        this.logger.error(
          `Stadia Maps API request timed out after ${TIMEOUT_MS}ms`,
        );
      } else {
        this.logger.error(
          `Stadia Maps API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}
