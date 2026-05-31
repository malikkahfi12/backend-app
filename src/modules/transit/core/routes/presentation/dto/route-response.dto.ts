import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RouteResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  feedSourceId: string | null;

  @ApiProperty({ example: 'route-1', nullable: true })
  externalRouteId: string | null;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  agencyId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  transitModeId: string;

  @ApiProperty({ example: '1' })
  shortName: string;

  @ApiProperty({ example: 'Koridor 1: Blok M — Kota' })
  longName: string;

  @ApiProperty({ example: 'Main north-south corridor', nullable: true })
  description: string | null;

  @ApiProperty({ example: 'FF0000', nullable: true })
  color: string | null;

  @ApiProperty({ example: 'FFFFFF', nullable: true })
  textColor: string | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiPropertyOptional({ example: '12345678', nullable: true })
  osmId?: string | null;

  @ApiPropertyOptional({ example: 'relation', nullable: true })
  osmType?: string | null;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  regionId?: string | null;

  @ApiPropertyOptional({
    description: 'Road geometry for the route path, encoded as polyline6',
    example: 'mzvmC{~}xV}AcAWm@Qe@',
  })
  geometry?: string | null;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  matchedOsmRouteId?: string | null;

  @ApiPropertyOptional({ example: 'gtfs' })
  geometrySource?: string | null;

  @ApiPropertyOptional({ example: 82.5, nullable: true })
  geometryConfidenceScore?: number | null;
}
