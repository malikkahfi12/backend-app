import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { PrismaCountryRepository } from './prisma-country.repository';

describe('PrismaCountryRepository', () => {
  it('creates countries with Prisma', async () => {
    const country = {
      id: 'country-1',
      code: 'ID',
      name: 'Indonesia',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const create = jest.fn().mockResolvedValue(country);
    const prismaService = {
      country: {
        create,
      },
    } as unknown as PrismaService;
    const repository = new PrismaCountryRepository(prismaService);

    await expect(
      repository.create({ code: 'ID', name: 'Indonesia' }),
    ).resolves.toBe(country);
    expect(create).toHaveBeenCalledWith({
      data: { code: 'ID', name: 'Indonesia' },
    });
  });
});
