import { OperatorEntity } from '../../domain/entities/operator.entity';
import { OperatorType } from '../../domain/enums/operator-type.enum';
import { OperatorRepository } from '../../domain/repositories/operator.repository.interface';
import { OperatorService } from './operator.service';

describe('OperatorService', () => {
  const operator: OperatorEntity = {
    id: 'operator-1',
    regionId: 'region-1',
    code: 'MRT_JAKARTA',
    name: 'MRT Jakarta',
    type: OperatorType.GOVERNMENT,
    websiteUrl: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  it('creates an operator through the repository', async () => {
    const create = jest.fn().mockResolvedValue(operator);
    const repository = {
      create,
      findAll: jest.fn(),
      findById: jest.fn(),
    } as unknown as OperatorRepository;
    const service = new OperatorService(repository);
    const input = {
      regionId: 'region-1',
      code: 'MRT_JAKARTA',
      name: 'MRT Jakarta',
      type: OperatorType.GOVERNMENT,
    };

    await expect(service.create(input)).resolves.toBe(operator);
    expect(create).toHaveBeenCalledWith(input);
  });

  it('lists operators through the repository', async () => {
    const repository = {
      create: jest.fn(),
      findAll: jest.fn().mockResolvedValue([operator]),
      findById: jest.fn(),
    } as unknown as OperatorRepository;
    const service = new OperatorService(repository);

    await expect(service.findAll()).resolves.toEqual([operator]);
  });
});
