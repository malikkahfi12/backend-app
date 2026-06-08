import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExplorePlaceItemDto } from './explore-place-item.dto';

class NearestStopDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'Halte Kota Tua' })
  name!: string;

  @ApiProperty({ example: 87.5 })
  distanceMeters!: number;
}

class PlaceActionsDto {
  @ApiProperty({
    example: true,
    description: 'Whether routing from/to a nearby stop is possible',
  })
  canRoute!: boolean;
}

export class PlaceDetailResponseDto extends ExplorePlaceItemDto {
  @ApiPropertyOptional({
    nullable: true,
    description: 'Nearest transit stop within 1000m, or null if none found',
  })
  nearestStop!: NearestStopDto | null;

  @ApiProperty()
  actions!: PlaceActionsDto;
}
