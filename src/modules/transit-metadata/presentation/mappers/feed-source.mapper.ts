import { FeedSourceEntity } from '../../domain/entities/feed-source.entity';
import { FeedSourceResponseDto } from '../dto/feed-source-response.dto';

export function toFeedSourceResponse(
  entity: FeedSourceEntity,
): FeedSourceResponseDto {
  return {
    id: entity.id,
    operatorId: entity.operatorId,
    type: entity.type,
    name: entity.name,
    url: entity.url,
    format: entity.format,
    isActive: entity.isActive,
  };
}
