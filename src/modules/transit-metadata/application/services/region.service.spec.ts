import { RegionEntity } from '../../domain/entities/region.entity';
import { RegionRepository } from '../../domain/repositories/region.repository.interface';
import { RegionService } from './region.service';

describe('RegionService', () => {
  const region: RegionEntity = {
    id: 'region-1',
    countryId: 'country-1',
    code: 'JKT',
    name: 'Jakarta',
    timezone: 'Asia/Jakarta',
    defaultLocale: 'id-ID',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  it('creates a region through the repository', async () => {
    const create = jest.fn().mockResolvedValue(region);
    const repository = {
      create,
      findAll: jest.fn(),
      findById: jest.fn(),
    } as unknown as RegionRepository;
    const service = new RegionService(repository);
    const input = {
      countryId: 'country-1',
      code: 'JKT',
      name: 'Jakarta',
      timezone: 'Asia/Jakarta',
      defaultLocale: 'id-ID',
    };

    await expect(service.create(input)).resolves.toBe(region);
    expect(create).toHaveBeenCalledWith(input);
  });

  it('lists regions through the repository', async () => {
    const repository = {
      create: jest.fn(),
      findAll: jest.fn().mockResolvedValue([region]),
      findById: jest.fn(),
    } as unknown as RegionRepository;
    const service = new RegionService(repository);

    await expect(service.findAll()).resolves.toEqual([region]);
  });
});
