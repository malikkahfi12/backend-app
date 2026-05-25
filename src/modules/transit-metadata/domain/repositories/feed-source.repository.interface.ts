import { FeedSourceEntity } from '../entities/feed-source.entity';
import { FeedFormat } from '../enums/feed-format.enum';
import { FeedSourceType } from '../enums/feed-source-type.enum';

export const FEED_SOURCE_REPOSITORY = Symbol('FEED_SOURCE_REPOSITORY');

export type CreateFeedSourceInput = {
  operatorId: string;
  type: FeedSourceType;
  name: string;
  url?: string | null;
  format: FeedFormat;
  isActive: boolean;
};

export interface FeedSourceRepository {
  create(input: CreateFeedSourceInput): Promise<FeedSourceEntity>;
  findAll(): Promise<FeedSourceEntity[]>;
  findById(id: string): Promise<FeedSourceEntity | null>;
}
