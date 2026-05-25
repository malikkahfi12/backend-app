import { TripRepository } from '../../domain/repositories/trip.repository.interface';
import { TripEntity } from '../../domain/entities/trip.entity';
import { TripService } from './trip.service';

describe('TripService', () => {
  const trip: TripEntity = {
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

  it('lists trips with routeId filter', async () => {
    const findAll = jest.fn().mockResolvedValue([trip]);
    const repository = {
      create: jest.fn(),
      findAll,
      findById: jest.fn(),
    } as unknown as TripRepository;
    const service = new TripService(repository);

    await expect(service.findAll({ routeId: 'route-1' })).resolves.toEqual([
      trip,
    ]);
  });

  it('does not expose shapeId', () => {
    expect((trip as Record<string, unknown>).shapeId).toBeUndefined();
  });
});
