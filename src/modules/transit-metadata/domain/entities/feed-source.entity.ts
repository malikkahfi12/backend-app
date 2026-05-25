import { FeedFormat } from '../enums/feed-format.enum';
import { FeedSourceType } from '../enums/feed-source-type.enum';

export type FeedSourceEntity = {
  id: string;
  operatorId: string;
  type: FeedSourceType;
  name: string;
  url: string | null;
  format: FeedFormat;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};
