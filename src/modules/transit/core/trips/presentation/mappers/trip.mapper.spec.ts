import { toTripResponse } from '../mappers/trip.mapper';
import { TripEntity } from '../../domain/entities/trip.entity';

describe('toTripResponse', () => {
  it('maps entity to response DTO', () => {
    const entity: TripEntity = {
      id: 'trip-1',
      routeId: 'route-1',
      serviceId: 'service-1',
      headsign: 'Blok M',
      directionId: 0,
      blockId: 'block-1',
      isActive: true,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    };

    const dto = toTripResponse(entity);
    expect(dto).toMatchObject({
      id: 'trip-1',
      routeId: 'route-1',
      headsign: 'Blok M',
      directionId: 0,
    });
    expect((dto as Record<string, unknown>).createdAt).toBeUndefined();
  });
});
