import { Injectable } from '@nestjs/common';
import { FeedSourceEntity } from '../../domain/entities/feed-source.entity';
import { CreateFeedSourceInput } from '../../domain/repositories/feed-source.repository.interface';
import { FeedSourceService } from '../services/feed-source.service';

@Injectable()
export class CreateFeedSourceUseCase {
  constructor(private readonly feedSourceService: FeedSourceService) {}

  execute(input: CreateFeedSourceInput): Promise<FeedSourceEntity> {
    return this.feedSourceService.create(input);
  }
}
