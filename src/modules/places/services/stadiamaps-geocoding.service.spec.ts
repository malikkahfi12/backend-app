import {
  StadiaMapsGeocodingService,
  NormalizedReverseResult,
} from './stadiamaps-geocoding.service';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '@/config/app.config';
import { RedisService } from '@/infrastructure/redis/redis.service';

describe('StadiaMapsGeocodingService', () => {
  let service: StadiaMapsGeocodingService;
  let mockFetch: jest.Mock;

  const mockFeature = (overrides?: Record<string, unknown>) => ({
    type: 'Feature' as const,
    geometry: {
      type: 'Point' as const,
      coordinates: [107.618, -6.902] as [number, number],
    },
    properties: {
      gid: 'openstreetmap:venue:12345',
      layer: 'venue',
      name: 'Gedung Sate',
      label: 'Gedung Sate, Bandung, Jawa Barat, Indonesia',
      formatted_address_line: 'Gedung Sate, Bandung, Jawa Barat, Indonesia',
      ...((overrides?.properties as Record<string, unknown>) ?? {}),
    },
    ...overrides,
  });

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        'stadiamaps.apiKey': 'test-api-key',
        'stadiamaps.baseUrl': 'https://api.stadiamaps.com',
      };
      return config[key];
    }),
  };

  const mockRedis = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(true),
  } as unknown as RedisService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        type: 'FeatureCollection',
        features: [mockFeature()],
      }),
    });
    global.fetch = mockFetch;
    mockRedis.get.mockReset();
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockReset();
    mockRedis.set.mockResolvedValue(true);
    service = new StadiaMapsGeocodingService(
      mockConfigService as unknown as ConfigService<AppConfig, true>,
      mockRedis,
    );
  });

  describe('search', () => {
    it('should normalize search results', async () => {
      const results = await service.search('Gedung Sate');

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        id: 'place:openstreetmap:venue:12345',
        name: 'Gedung Sate',
        address: 'Gedung Sate, Bandung, Jawa Barat, Indonesia',
        latitude: -6.902,
        longitude: 107.618,
        type: 'venue',
        provider: 'stadiamaps',
      });
    });

    it('should return empty array for no results', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest
          .fn()
          .mockResolvedValue({ type: 'FeatureCollection', features: [] }),
      });

      const results = await service.search('nothing');

      expect(results).toEqual([]);
    });

    it('should return empty array on API error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('error'),
      });

      const results = await service.search('test');

      expect(results).toEqual([]);
    });

    it('should return empty array on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const results = await service.search('test');

      expect(results).toEqual([]);
    });

    it('should apply limit parameter', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          type: 'FeatureCollection',
          features: [
            mockFeature({
              properties: {
                gid: '1',
                name: 'Station A',
                layer: 'venue',
                label: 'Station A',
              },
            }),
            mockFeature({
              properties: {
                gid: '2',
                name: 'Station B',
                layer: 'venue',
                label: 'Station B',
              },
            }),
            mockFeature({
              properties: {
                gid: '3',
                name: 'Station C',
                layer: 'venue',
                label: 'Station C',
              },
            }),
          ],
        }),
      });

      const results = await service.search('test', { limit: 2 });

      expect(results).toHaveLength(2);
    });

    it('should deduplicate results with the same name (case-insensitive)', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          type: 'FeatureCollection',
          features: [
            mockFeature({
              properties: {
                gid: 'a',
                name: 'Ancol',
                layer: 'venue',
                label: 'Ancol',
              },
            }),
            mockFeature({
              properties: {
                gid: 'b',
                name: 'ANC kol',
                layer: 'venue',
                label: 'ANC kol',
              },
            }),
            mockFeature({
              properties: {
                gid: 'c',
                name: 'Ancol',
                layer: 'venue',
                label: 'Ancol',
              },
            }),
          ],
        }),
      });

      const results = await service.search('ancol', { limit: 5 });

      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('Ancol');
      expect(results[1].name).toBe('ANC kol');
    });

    it('should include focus point and boundary rect when lat/lng provided', async () => {
      await service.search('test', { lat: -6.2, lng: 106.8 });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('focus.point.lon=106.8');
      expect(url).toContain('focus.point.lat=-6.2');
      expect(url).toContain('boundary.rect.min_lon=105.8');
      expect(url).toContain('boundary.rect.max_lon=107.8');
      expect(url).toContain('boundary.rect.min_lat=-7.2');
      expect(url).toContain('boundary.rect.max_lat=-5.2');
    });

    it('should not include focus/boundary when lat/lng omitted', async () => {
      await service.search('test');

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).not.toContain('focus.point');
      expect(url).not.toContain('boundary.rect');
    });

    it('should use fallback name when property name is missing', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          type: 'FeatureCollection',
          features: [
            mockFeature({
              properties: {
                gid: 'addr:1',
                layer: 'address',
                label: 'Fallback Name, City, Country',
              },
            }),
          ],
        }),
      });

      const results = await service.search('test');

      expect(results[0].name).toBe('Unknown');
    });

    it('should use Stadia Maps v1 search endpoint with api_key', async () => {
      await service.search('test');

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('/geocoding/v1/search');
      expect(url).toContain('text=test');
      expect(url).toContain('api_key=test-api-key');
    });

    it('should return cached result without calling API on search cache hit', async () => {
      mockRedis.get.mockResolvedValueOnce([
        {
          id: 'place:cached',
          name: 'Cached Place',
          address: 'Cached Address',
          latitude: -6.902,
          longitude: 107.618,
          type: 'venue',
          provider: 'stadiamaps',
        },
      ]);

      const results = await service.search('Gedung Sate');

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('place:cached');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should call API when Redis get fails', async () => {
      mockRedis.get.mockRejectedValueOnce(new Error('Redis down'));

      const results = await service.search('Gedung Sate');

      expect(results).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should store result in Redis after successful API search', async () => {
      mockRedis.get.mockResolvedValueOnce(null);

      await service.search('Gedung Sate');

      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining('stadiamaps:geocode:search'),
        expect.any(Array),
        86400,
      );
    });

    it('should include lang parameter in URL when provided', async () => {
      await service.search('test', { lang: 'id' });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('lang=id');
    });

    it('should not include lang parameter in URL when omitted', async () => {
      await service.search('test');

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).not.toContain('lang=');
    });

    it('should include lang in cache key when provided', async () => {
      mockRedis.get.mockResolvedValueOnce(null);

      await service.search('test', { lang: 'ko' });

      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining(':ko'),
        expect.any(Array),
        86400,
      );
    });
  });

  describe('reverse', () => {
    it('should normalize reverse results', async () => {
      const result = (await service.reverse(
        -6.2,
        106.8,
      )) as NormalizedReverseResult;

      expect(result).toBeDefined();
      expect(result).toEqual({
        name: 'Gedung Sate',
        address: 'Gedung Sate, Bandung, Jawa Barat, Indonesia',
        latitude: -6.902,
        longitude: 107.618,
        provider: 'stadiamaps',
      });
    });

    it('should return null for no reverse results', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest
          .fn()
          .mockResolvedValue({ type: 'FeatureCollection', features: [] }),
      });

      const result = await service.reverse(0, 0);

      expect(result).toBeNull();
    });

    it('should return null on API error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('error'),
      });

      const result = await service.reverse(0, 0);

      expect(result).toBeNull();
    });

    it('should return cached reverse result without calling API', async () => {
      mockRedis.get.mockResolvedValueOnce({
        name: 'Kebon Sirih',
        address: 'Jakarta, Indonesia',
        latitude: -6.2,
        longitude: 106.8,
        provider: 'stadiamaps',
      });

      const result = await service.reverse(-6.2, 106.8);

      expect(result).toEqual({
        name: 'Kebon Sirih',
        address: 'Jakarta, Indonesia',
        latitude: -6.2,
        longitude: 106.8,
        provider: 'stadiamaps',
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should call API for reverse when Redis get fails', async () => {
      mockRedis.get.mockRejectedValueOnce(new Error('Redis down'));

      const result = await service.reverse(-6.2, 106.8);

      expect(result).toBeDefined();
      expect(mockFetch).toHaveBeenCalled();
    });
  });
});
