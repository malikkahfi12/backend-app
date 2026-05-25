import { FeedSourceEntity } from '../../domain/entities/feed-source.entity';
import { FeedFormat } from '../../domain/enums/feed-format.enum';
import { FeedSourceType } from '../../domain/enums/feed-source-type.enum';
import { FeedSourceRepository } from '../../domain/repositories/feed-source.repository.interface';
import { FeedSourceService } from './feed-source.service';

describe('FeedSourceService', () => {
  const feedSource: FeedSourceEntity = {
    id: 'feed-source-1',
    operatorId: 'operator-1',
    type: FeedSourceType.GTFS_STATIC,
    name: 'MRT Jakarta GTFS Static',
    url: null,
    format: FeedFormat.GTFS_ZIP,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  it('creates a feed source through the repository', async () => {
    const create = jest.fn().mockResolvedValue(feedSource);
    const repository = {
      create,
      findAll: jest.fn(),
      findById: jest.fn(),
    } as unknown as FeedSourceRepository;
    const service = new FeedSourceService(repository);
    const input = {
      operatorId: 'operator-1',
      type: FeedSourceType.GTFS_STATIC,
      name: 'MRT Jakarta GTFS Static',
      format: FeedFormat.GTFS_ZIP,
      isActive: true,
    };

    await expect(service.create(input)).resolves.toBe(feedSource);
    expect(create).toHaveBeenCalledWith(input);
  });

  it('lists feed sources through the repository', async () => {
    const repository = {
      create: jest.fn(),
      findAll: jest.fn().mockResolvedValue([feedSource]),
      findById: jest.fn(),
    } as unknown as FeedSourceRepository;
    const service = new FeedSourceService(repository);

    await expect(service.findAll()).resolves.toEqual([feedSource]);
  });
});
