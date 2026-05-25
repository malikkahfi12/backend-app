import { ApiProperty } from '@nestjs/swagger';
import { FeedFormat } from '../../domain/enums/feed-format.enum';
import { FeedSourceType } from '../../domain/enums/feed-source-type.enum';

export class FeedSourceResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  operatorId: string;

  @ApiProperty({ enum: FeedSourceType, example: FeedSourceType.GTFS_STATIC })
  type: FeedSourceType;

  @ApiProperty({ example: 'MRT Jakarta GTFS Static' })
  name: string;

  @ApiProperty({ example: 'https://example.com/feed.zip', nullable: true })
  url: string | null;

  @ApiProperty({ enum: FeedFormat, example: FeedFormat.GTFS_ZIP })
  format: FeedFormat;

  @ApiProperty({ example: true })
  isActive: boolean;
}
