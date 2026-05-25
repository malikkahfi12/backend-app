import { StopRepository } from '../../domain/repositories/stop.repository.interface';
import { StopEntity } from '../../domain/entities/stop.entity';
import { StopService } from './stop.service';

describe('StopService', () => {
  const stop: StopEntity = {
    id: 'stop-1',
    regionId: 'region-1',
    code: 'ST001',
    name: 'Bundaran HI',
    slug: 'bundaran-hi',
    latitude: -6.2,
    longitude: 106.8,
    address: 'Jl. MH Thamrin',
    isStation: true,
    parentStationId: null,
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  it('creates a stop', async () => {
    const create = jest.fn().mockResolvedValue(stop);
    const repository = {
      create,
      findAll: jest.fn(),
      findById: jest.fn(),
    } as unknown as StopRepository;
    const service = new StopService(repository);

    await expect(
      service.create({
        regionId: 'region-1',
        name: 'Bundaran HI',
        slug: 'bundaran-hi',
        latitude: -6.2,
        longitude: 106.8,
      }),
    ).resolves.toBe(stop);
    expect(create).toHaveBeenCalled();
  });

  it('lists stops with filters', async () => {
    const findAll = jest.fn().mockResolvedValue([stop]);
    const repository = {
      create: jest.fn(),
      findAll,
      findById: jest.fn(),
    } as unknown as StopRepository;
    const service = new StopService(repository);

    await expect(
      service.findAll({ regionId: 'region-1', isStation: true }),
    ).resolves.toEqual([stop]);
  });
});
