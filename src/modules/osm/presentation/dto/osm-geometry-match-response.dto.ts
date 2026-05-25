import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MatchDetailDto {
  @ApiProperty()
  gtfsRouteId!: string;

  @ApiProperty()
  osmRouteId!: string;

  @ApiProperty({ example: 82 })
  score!: number;

  @ApiProperty()
  details!: {
    nameScore: number;
    modeScore: number;
    stopOverlapScore: number;
    geometryProximityScore: number;
    directionScore: number;
  };
}

export class OsmGeometryMatchResponseDto {
  @ApiProperty({ example: 45 })
  totalGtfsRoutes!: number;

  @ApiProperty({ example: 12 })
  matched!: number;

  @ApiProperty({ example: 30 })
  skipped!: number;

  @ApiProperty({ example: 3 })
  lowConfidence!: number;

  @ApiProperty({ example: 12 })
  replacedGeometryCount!: number;

  @ApiProperty({ type: [MatchDetailDto] })
  details!: MatchDetailDto[];

  @ApiProperty({ example: [] })
  errors!: string[];
}
