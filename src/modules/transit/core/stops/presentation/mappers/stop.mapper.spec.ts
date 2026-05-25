import { toStopResponse } from '../mappers/stop.mapper';
import { StopEntity } from '../../domain/entities/stop.entity';

describe('toStopResponse', () => {
  it('maps entity to response DTO with coordinates', () => {
    const entity: StopEntity = {
      id: 'stop-1',
      feedSourceId: null,
      externalStopId: null,
      regionId: 'region-1',
      code: 'ST001',
      name: 'Bundaran HI',
      slug: 'bundaran-hi',
      latitude: -6.2,
      longitude: 106.8,
      address: 'Jl. MH Thamrin',
      locationType: null,
      isStation: true,
      parentStationId: null,
      isActive: true,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      osmId: null,
      osmType: null,
      source: 'gtfs',
      mode: null,
    };

    const dto = toStopResponse(entity);
    expect(dto.latitude).toBe(-6.2);
    expect(dto.longitude).toBe(106.8);
    expect(dto.isStation).toBe(true);
    expect((dto as Record<string, unknown>).createdAt).toBeUndefined();
  });
});
