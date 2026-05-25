import { RouteRepository } from '../../domain/repositories/route.repository.interface';
import { RouteEntity } from '../../domain/entities/route.entity';
import { RouteService } from './route.service';

describe('RouteService', () => {
  const route: RouteEntity = {
    id: 'route-1',
    agencyId: 'agency-1',
    transitModeId: 'mode-1',
    shortName: '1',
    longName: 'Koridor 1',
    description: 'Main corridor',
    color: 'FF0000',
    textColor: 'FFFFFF',
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  it('lists routes with filters', async () => {
    const findAll = jest.fn().mockResolvedValue([route]);
    const repository = {
      create: jest.fn(),
      findAll,
      findById: jest.fn(),
    } as unknown as RouteRepository;
    const service = new RouteService(repository);

    await expect(service.findAll({ agencyId: 'agency-1' })).resolves.toEqual([
      route,
    ]);
    expect(findAll).toHaveBeenCalledWith({ agencyId: 'agency-1' });
  });
});
