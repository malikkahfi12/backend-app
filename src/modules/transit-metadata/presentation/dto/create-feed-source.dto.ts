import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { FeedFormat } from '../../domain/enums/feed-format.enum';
import { FeedSourceType } from '../../domain/enums/feed-source-type.enum';

export class CreateFeedSourceDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  operatorId!: string;

  @ApiProperty({ enum: FeedSourceType, example: FeedSourceType.GTFS_STATIC })
  @IsEnum(FeedSourceType)
  type!: FeedSourceType;

  @ApiProperty({ example: 'MRT Jakarta GTFS Static' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUrl({ require_tld: false })
  url?: string;

  @ApiProperty({ enum: FeedFormat, example: FeedFormat.GTFS_ZIP })
  @IsEnum(FeedFormat)
  format!: FeedFormat;

  @ApiProperty({ example: true })
  @IsBoolean()
  isActive!: boolean;
}
