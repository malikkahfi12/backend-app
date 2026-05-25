import { AgencyRepository } from '../../domain/repositories/agency.repository.interface';
import { AgencyEntity } from '../../domain/entities/agency.entity';
import { AgencyService } from './agency.service';

describe('AgencyService', () => {
  const agency: AgencyEntity = {
    id: 'agency-1',
    regionId: 'region-1',
    operatorId: 'operator-1',
    name: 'TransJakarta',
    slug: 'transjakarta',
    timezone: 'Asia/Jakarta',
    language: 'id',
    phone: '+62211500',
    website: 'https://transjakarta.co.id',
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  it('creates an agency', async () => {
    const create = jest.fn().mockResolvedValue(agency);
    const repository = {
      create,
      findAll: jest.fn(),
      findById: jest.fn(),
    } as unknown as AgencyRepository;
    const service = new AgencyService(repository);

    await expect(
      service.create({
        regionId: 'region-1',
        operatorId: 'operator-1',
        name: 'TransJakarta',
        slug: 'transjakarta',
        timezone: 'Asia/Jakarta',
      }),
    ).resolves.toBe(agency);
    expect(create).toHaveBeenCalled();
  });

  it('lists agencies with filters', async () => {
    const findAll = jest.fn().mockResolvedValue([agency]);
    const repository = {
      create: jest.fn(),
      findAll,
      findById: jest.fn(),
    } as unknown as AgencyRepository;
    const service = new AgencyService(repository);

    await expect(service.findAll({ regionId: 'region-1' })).resolves.toEqual([
      agency,
    ]);
    expect(findAll).toHaveBeenCalledWith({ regionId: 'region-1' });
  });
});
