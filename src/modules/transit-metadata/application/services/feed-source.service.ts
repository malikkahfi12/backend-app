import { Inject, Injectable } from '@nestjs/common';
import type { FeedSourceEntity } from '../../domain/entities/feed-source.entity';
import { FEED_SOURCE_REPOSITORY } from '../../domain/repositories/feed-source.repository.interface';
import type {
  CreateFeedSourceInput,
  FeedSourceRepository,
} from '../../domain/repositories/feed-source.repository.interface';

@Injectable()
export class FeedSourceService {
  constructor(
    @Inject(FEED_SOURCE_REPOSITORY)
    private readonly feedSourceRepository: FeedSourceRepository,
  ) {}

  create(input: CreateFeedSourceInput): Promise<FeedSourceEntity> {
    return this.feedSourceRepository.create(input);
  }

  findAll(): Promise<FeedSourceEntity[]> {
    return this.feedSourceRepository.findAll();
  }
}
