import { InternalServerErrorException } from '@nestjs/common';
import { SearchService } from './search.service';
import { StopService } from '../../transit/core/stops/application/services/stop.service';
import { PlacesService } from '../../places/services/places.service';
import type { StopEntity } from '../../transit/core/stops/domain/entities/stop.entity';

function mockStop(overrides?: Partial<StopEntity>): StopEntity {
  return {
    id: 'stop-uuid-1',
    feedSourceId: null,
    externalStopId: null,
    regionId: 'region-1',
    code: null,
    name: 'Bandung Station',
    slug: 'bandung-station',
    latitude: -6.914,
    longitude: 107.609,
    address: null,
    locationType: null,
    isStation: true,
    parentStationId: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    osmId: null,
    osmType: null,
    source: null,
    mode: null,
    ...overrides,
  };
}

function mockPlaceResult(overrides?: Record<string, unknown>) {
  return {
    id: 'place:12345',
    name: 'Gedung Sate',
    address: 'Bandung, Jawa Barat, Indonesia',
    latitude: -6.902,
    longitude: 107.618,
    type: 'poi',
    provider: 'stadiamaps',
    ...overrides,
  };
}

describe('SearchService', () => {
  const mockStopService = {
    findAll: jest.fn() as jest.Mock<Promise<StopEntity[]>>,
  };

  const mockPlacesService = {
    search: jest.fn() as jest.Mock<
      Promise<
        {
          id: string;
          name: string;
          address: string;
          latitude: number;
          longitude: number;
          type: string;
          provider: string;
        }[]
      >
    >,
  };

  const service = new SearchService(
    mockStopService as unknown as StopService,
    mockPlacesService as unknown as PlacesService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('aggregate', () => {
    it('should return results from both sources', async () => {
      mockStopService.findAll.mockResolvedValue([mockStop()]);
      mockPlacesService.search.mockResolvedValue([mockPlaceResult()]);

      const result = await service.aggregate('bandung', { limit: 5 });

      expect(result.data.query).toBe('bandung');
      expect(result.data.stops).toHaveLength(1);
      expect(result.data.stops[0]).toEqual({
        id: 'stop-uuid-1',
        name: 'Bandung Station',
        latitude: -6.914,
        longitude: 107.609,
        type: 'stop',
      });
      expect(result.data.places).toHaveLength(1);
      expect(result.data.places[0]).toEqual(mockPlaceResult());
      expect(result.meta).toEqual({
        stopCount: 1,
        placeCount: 1,
        partial: false,
      });
    });

    it('should return stops when places fail (partial: true)', async () => {
      mockStopService.findAll.mockResolvedValue([mockStop()]);
      mockPlacesService.search.mockRejectedValue(new Error('MapTiler error'));

      const result = await service.aggregate('bandung');

      expect(result.data.stops).toHaveLength(1);
      expect(result.data.places).toHaveLength(0);
      expect(result.meta.partial).toBe(true);
      expect(result.meta.stopCount).toBe(1);
      expect(result.meta.placeCount).toBe(0);
    });

    it('should return places when stops fail (partial: true)', async () => {
      mockStopService.findAll.mockRejectedValue(new Error('DB error'));
      mockPlacesService.search.mockResolvedValue([mockPlaceResult()]);

      const result = await service.aggregate('bandung');

      expect(result.data.stops).toHaveLength(0);
      expect(result.data.places).toHaveLength(1);
      expect(result.meta.partial).toBe(true);
      expect(result.meta.stopCount).toBe(0);
      expect(result.meta.placeCount).toBe(1);
    });

    it('should throw when both sources fail', async () => {
      mockStopService.findAll.mockRejectedValue(new Error('DB error'));
      mockPlacesService.search.mockRejectedValue(new Error('MapTiler error'));

      await expect(service.aggregate('bandung')).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should deduplicate stops with the same name', async () => {
      mockStopService.findAll.mockResolvedValue([
        mockStop({ id: 'stop-1', name: 'Ancol' }),
        mockStop({ id: 'stop-2', name: 'Ancol' }),
        mockStop({ id: 'stop-3', name: 'Ancol Pintu 2' }),
      ]);
      mockPlacesService.search.mockResolvedValue([]);

      const result = await service.aggregate('ancol');

      expect(result.data.stops).toHaveLength(2);
      expect(result.data.stops[0].name).toBe('Ancol');
      expect(result.data.stops[1].name).toBe('Ancol Pintu 2');
      expect(result.meta.stopCount).toBe(2);
    });

    it('should pass lat/lng proximity to places search', async () => {
      mockStopService.findAll.mockResolvedValue([]);
      mockPlacesService.search.mockResolvedValue([]);

      await service.aggregate('bandung', { lat: -6.2, lng: 106.8, limit: 5 });

      expect(mockPlacesService.search).toHaveBeenCalledWith('bandung', {
        lat: -6.2,
        lng: 106.8,
        limit: 5,
      });
    });
  });
});
