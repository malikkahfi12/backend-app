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

export interface ExploreBBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export interface ExplorePlaceItem {
  id: string;
  source: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

const TIMEOUT_MS = 10_000;

const REGIONAL_BBOX_DEGREES = 1.0;

const GEOCODE_CACHE_TTL_SECONDS = 21_600;

const EXPLORE_CACHE_TTL_SECONDS = 3600;

const SEARCH_CACHE_TTL_SECONDS = 7200;

const CATEGORY_MAP: Record<string, string> = {
  food: 'restaurant',
  coffee: 'cafe',
  cafe: 'cafe',
  shopping: 'shop',
  attractions: 'tourist attraction',
  parks: 'park',
  hotels: 'hotel',
  hospital: 'hospital',
  pharmacy: 'pharmacy',
  fuel: 'gas station',
  parking: 'parking',
  bank: 'bank',
  atm: 'atm',
};

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

  async explore(
    bbox: ExploreBBox,
    category?: string,
    limit?: number,
  ): Promise<ExplorePlaceItem[]> {
    const size = limit ?? 20;
    const text = category
      ? (CATEGORY_MAP[category.toLowerCase()] ?? category)
      : 'place';

    const params = new URLSearchParams({
      api_key: this.apiKey,
      text,
      size: String(size),
    });

    params.set('layers', 'poi');
    params.set('boundary.rect.min_lon', String(bbox.minLng));
    params.set('boundary.rect.max_lon', String(bbox.maxLng));
    params.set('boundary.rect.min_lat', String(bbox.minLat));
    params.set('boundary.rect.max_lat', String(bbox.maxLat));

    const bboxKey = `${bbox.minLng.toFixed(3)},${bbox.minLat.toFixed(3)},${bbox.maxLng.toFixed(3)},${bbox.maxLat.toFixed(3)}`;
    const cacheKey = `stadiamaps:explore:${bboxKey}:${text}:${size}`;

    try {
      const cached = await this.redis.get<ExplorePlaceItem[]>(cacheKey);
      if (cached !== null) {
        this.logger.log(
          `Cache HIT for explore: (${bboxKey}) category="${text}"`,
        );
        return cached;
      }
    } catch {
      this.logger.warn(
        `Redis get failed for explore cache, falling through to API`,
      );
    }

    const url = `${this.baseUrl}/geocoding/v2/search?${params.toString()}`;

    this.logger.log(`Explore: bbox=(${bboxKey}) category="${text}"`);

    const data = await this.fetchWithTimeout(url);

    if (!data || !data.features || data.features.length === 0) {
      this.logger.log(`No explore results for bbox=(${bboxKey})`);
      return [];
    }

    const rawResults = data.features
      .filter((f) => {
        const layer = f.properties?.layer as string | undefined;
        return layer === 'poi' || layer === 'venue';
      })
      .map((f) => this.normalizeExploreResult(f))
      .filter((r): r is ExplorePlaceItem => r !== null);

    const results = rawResults
      .filter(
        (r, i, arr) =>
          arr.findIndex(
            (p) => p.name.toLowerCase() === r.name.toLowerCase(),
          ) === i,
      )
      .slice(0, size);

    try {
      await this.redis.set(cacheKey, results, EXPLORE_CACHE_TTL_SECONDS);
    } catch {
      this.logger.warn(`Redis set failed for explore cache`);
    }

    return results;
  }

  async searchPlaces(
    query: string,
    opts?: {
      lat?: number;
      lng?: number;
      limit?: number;
      lang?: string;
      bbox?: ExploreBBox;
    },
  ): Promise<ExplorePlaceItem[]> {
    const limit = opts?.limit ?? 20;
    const fetchLimit = limit + 2;
    const params = new URLSearchParams({
      api_key: this.apiKey,
      text: query,
      size: String(fetchLimit),
    });

    params.set('layers', 'poi');

    if (opts?.lang) {
      params.set('lang', opts.lang);
    }

    if (opts?.lng !== undefined && opts?.lat !== undefined) {
      params.set('focus.point.lon', String(opts.lng));
      params.set('focus.point.lat', String(opts.lat));
    }

    if (opts?.bbox) {
      params.set('boundary.rect.min_lon', String(opts.bbox.minLng));
      params.set('boundary.rect.max_lon', String(opts.bbox.maxLng));
      params.set('boundary.rect.min_lat', String(opts.bbox.minLat));
      params.set('boundary.rect.max_lat', String(opts.bbox.maxLat));
    }

    const bboxHash = opts?.bbox
      ? `:${opts.bbox.minLng.toFixed(3)},${opts.bbox.minLat.toFixed(3)},${opts.bbox.maxLng.toFixed(3)},${opts.bbox.maxLat.toFixed(3)}`
      : '';
    const cacheKey = `stadiamaps:places:search:${query.trim().toLowerCase()}:${(opts?.lat ?? 0).toFixed(3)}:${(opts?.lng ?? 0).toFixed(3)}:${limit}:${opts?.lang ?? ''}${bboxHash}`;

    try {
      const cached = await this.redis.get<ExplorePlaceItem[]>(cacheKey);
      if (cached !== null) {
        this.logger.log(`Cache HIT for places search: "${query}"`);
        return cached;
      }
    } catch {
      this.logger.warn(
        `Redis get failed for places search cache, falling through to API`,
      );
    }

    const url = `${this.baseUrl}/geocoding/v2/search?${params.toString()}`;

    this.logger.log(`Places search: "${query}" (limit=${limit})`);

    const data = await this.fetchWithTimeout(url);

    if (!data || !data.features || data.features.length === 0) {
      this.logger.log(`No places search results for query: "${query}"`);
      return [];
    }

    const rawResults = data.features
      .map((f) => this.normalizeExploreResult(f))
      .filter((r): r is ExplorePlaceItem => r !== null);

    const results = rawResults
      .filter(
        (r, i, arr) =>
          arr.findIndex(
            (p) => p.name.toLowerCase() === r.name.toLowerCase(),
          ) === i,
      )
      .slice(0, limit);

    try {
      await this.redis.set(cacheKey, results, SEARCH_CACHE_TTL_SECONDS);
    } catch {
      this.logger.warn(`Redis set failed for places search cache`);
    }

    return results;
  }

  async getPlaceDetail(id: string): Promise<ExplorePlaceItem | null> {
    const cacheKey = `stadiamaps:places:detail:${id}`;

    try {
      const cached = await this.redis.get<ExplorePlaceItem>(cacheKey);
      if (cached !== null) {
        this.logger.log(`Cache HIT for place detail: "${id}"`);
        return cached;
      }
    } catch {
      this.logger.warn(
        `Redis get failed for place detail cache, falling through to API`,
      );
    }

    const params = new URLSearchParams({
      api_key: this.apiKey,
      ids: id,
    });

    const url = `${this.baseUrl}/geocoding/v2/place_details?${params.toString()}`;

    this.logger.log(`Place detail lookup: "${id}"`);

    const data = await this.fetchWithTimeout(url);

    if (!data || !data.features || data.features.length === 0) {
      this.logger.log(`No place detail found for id: "${id}"`);
      return null;
    }

    const result = this.normalizeExploreResult(data.features[0]);

    if (result) {
      try {
        await this.redis.set(cacheKey, result, GEOCODE_CACHE_TTL_SECONDS);
      } catch {
        this.logger.warn(`Redis set failed for place detail cache`);
      }
    }

    return result;
  }

  private normalizeExploreResult(
    f: StadiaMapsFeature,
  ): ExplorePlaceItem | null {
    const [lng, lat] = f.geometry.coordinates;
    const props = f.properties ?? {};

    const name = (props.name as string) ?? '';
    if (!name) return null;

    return {
      id: (props.gid as string) ?? '',
      source: extractSource(props),
      name,
      address:
        (props.formatted_address_line as string) ??
        (props.label as string) ??
        '',
      lat,
      lng,
    };
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

function extractSource(props: Record<string, unknown>): string {
  const sources = props.sources as Array<{ source: string }> | undefined;
  if (sources && sources.length > 0 && sources[0].source) {
    return sources[0].source;
  }
  return (props.source as string) ?? 'unknown';
}
