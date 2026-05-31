import {
  MapTilerGeocodingService,
  NormalizedReverseResult,
} from './maptiler-geocoding.service';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '@/config/app.config';

describe('MapTilerGeocodingService', () => {
  let service: MapTilerGeocodingService;
  let mockFetch: jest.Mock;

  const mockFeature = (overrides?: Record<string, unknown>) => ({
    type: 'Feature' as const,
    id: '12345',
    geometry: {
      type: 'Point' as const,
      coordinates: [107.618, -6.902] as [number, number],
    },
    properties: {
      name: 'Gedung Sate',
      ...((overrides?.properties as Record<string, unknown>) ?? {}),
    },
    place_name: 'Gedung Sate, Bandung, Jawa Barat, Indonesia',
    place_type: ['poi'],
    center: [107.618, -6.902] as [number, number],
    ...overrides,
  });

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        'maptiler.apiKey': 'test-api-key',
        'maptiler.geocodingBaseUrl': 'https://api.maptiler.com',
      };
      return config[key];
    }),
  };

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
    service = new MapTilerGeocodingService(
      mockConfigService as unknown as ConfigService<AppConfig, true>,
    );
  });

  describe('search', () => {
    it('should normalize search results', async () => {
      const results = await service.search('Gedung Sate');

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        id: 'place:12345',
        name: 'Gedung Sate',
        address: 'Gedung Sate, Bandung, Jawa Barat, Indonesia',
        latitude: -6.902,
        longitude: 107.618,
        type: 'poi',
        provider: 'maptiler',
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
            mockFeature({ id: '1', properties: { name: 'Station A' }, place_type: ['poi'] }),
            mockFeature({ id: '2', properties: { name: 'Station B' }, place_type: ['poi'] }),
            mockFeature({ id: '3', properties: { name: 'Station C' }, place_type: ['poi'] }),
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
            mockFeature({ id: 'a', properties: { name: 'Ancol' }, place_type: ['poi'] }),
            mockFeature({ id: 'b', properties: { name: 'ANC kol' }, place_type: ['poi'] }),
            mockFeature({ id: 'c', properties: { name: 'Ancol' }, place_type: ['poi'] }),
          ],
        }),
      });

      const results = await service.search('ancol', { limit: 5 });

      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('Ancol');
      expect(results[1].name).toBe('ANC kol');
    });

    it('should include proximity and regional bbox when lat/lng provided', async () => {
      await service.search('test', { lat: -6.2, lng: 106.8 });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('proximity=106.8%2C-6.2');
      expect(url).toContain('bbox=105.8%2C-7.2%2C107.8%2C-5.2');
    });

    it('should not include bbox when lat/lng omitted', async () => {
      await service.search('test');

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).not.toContain('proximity=');
      expect(url).not.toContain('bbox=');
    });

    it('should use fallback name when property name is missing', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          type: 'FeatureCollection',
          features: [
            mockFeature({
              properties: {},
              place_name: 'Fallback Name, City, Country',
              place_type: ['place'],
            }),
          ],
        }),
      });

      const results = await service.search('test');

      expect(results[0].name).toBe('Fallback Name');
    });

    it('should use MapTiler geocoding URL format with key auth', async () => {
      await service.search('test');

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('/geocoding/test.json');
      expect(url).toContain('key=test-api-key');
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
        provider: 'maptiler',
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
  });
});
