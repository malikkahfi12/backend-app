import { CountryEntity } from '../../domain/entities/country.entity';
import { CountryRepository } from '../../domain/repositories/country.repository.interface';
import { CountryService } from './country.service';

describe('CountryService', () => {
  const country: CountryEntity = {
    id: 'country-1',
    code: 'ID',
    name: 'Indonesia',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  it('creates a country through the repository', async () => {
    const create = jest.fn().mockResolvedValue(country);
    const repository = {
      create,
      findAll: jest.fn(),
      findById: jest.fn(),
    } as unknown as CountryRepository;
    const service = new CountryService(repository);

    await expect(
      service.create({ code: 'ID', name: 'Indonesia' }),
    ).resolves.toBe(country);
    expect(create).toHaveBeenCalledWith({
      code: 'ID',
      name: 'Indonesia',
    });
  });

  it('lists countries through the repository', async () => {
    const repository = {
      create: jest.fn(),
      findAll: jest.fn().mockResolvedValue([country]),
      findById: jest.fn(),
    } as unknown as CountryRepository;
    const service = new CountryService(repository);

    await expect(service.findAll()).resolves.toEqual([country]);
  });
});
