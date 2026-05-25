import { TransitModeEntity } from '../../domain/entities/transit-mode.entity';
import { TransitModeRepository } from '../../domain/repositories/transit-mode.repository.interface';
import { TransitModeService } from './transit-mode.service';

describe('TransitModeService', () => {
  const transitMode: TransitModeEntity = {
    id: 'mode-1',
    code: 'MRT',
    name: 'MRT',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  it('creates a transit mode through the repository', async () => {
    const create = jest.fn().mockResolvedValue(transitMode);
    const repository = {
      create,
      findAll: jest.fn(),
      findById: jest.fn(),
    } as unknown as TransitModeRepository;
    const service = new TransitModeService(repository);

    await expect(service.create({ code: 'MRT', name: 'MRT' })).resolves.toBe(
      transitMode,
    );
    expect(create).toHaveBeenCalledWith({
      code: 'MRT',
      name: 'MRT',
    });
  });

  it('lists transit modes through the repository', async () => {
    const repository = {
      create: jest.fn(),
      findAll: jest.fn().mockResolvedValue([transitMode]),
      findById: jest.fn(),
    } as unknown as TransitModeRepository;
    const service = new TransitModeService(repository);

    await expect(service.findAll()).resolves.toEqual([transitMode]);
  });
});
