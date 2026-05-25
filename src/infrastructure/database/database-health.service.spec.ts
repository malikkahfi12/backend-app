import { DatabaseHealthService } from './database-health.service';
import { PrismaService } from './prisma.service';

describe('DatabaseHealthService', () => {
  it('returns ok when database and PostGIS are available', async () => {
    const prismaService = {
      $queryRaw: jest.fn().mockResolvedValue([{ postgis_version: '3.4' }]),
    } as unknown as PrismaService;
    const service = new DatabaseHealthService(prismaService);

    await expect(service.check()).resolves.toEqual({
      status: 'ok',
      postgis: 'enabled',
    });
  });

  it('returns down when database health check fails', async () => {
    const prismaService = {
      $queryRaw: jest.fn().mockRejectedValue(new Error('connection failed')),
    } as unknown as PrismaService;
    const service = new DatabaseHealthService(prismaService);

    await expect(service.check()).resolves.toEqual({
      status: 'down',
      postgis: 'unknown',
    });
  });
});
