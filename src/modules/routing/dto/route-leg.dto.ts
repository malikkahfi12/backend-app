import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoutingEdgeType } from '../enums/routing-edge-type.enum';
import { RouteAlternativeDto } from './route-alternative.dto';

export class RouteLegDto {
  @ApiProperty({ enum: RoutingEdgeType, example: RoutingEdgeType.WALK })
  type!: RoutingEdgeType;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  fromStopId?: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    required: false,
  })
  toStopId?: string;

  @ApiProperty({ example: 'Harmoni', required: false })
  fromStopName?: string;

  @ApiProperty({ example: 'Kota', required: false })
  toStopName?: string;

  @ApiProperty({ example: '-6.167,106.828', required: false })
  fromCoordinates?: string;

  @ApiProperty({ example: '-6.135,106.813', required: false })
  toCoordinates?: string;

  @ApiProperty({ example: 300 })
  durationSeconds!: number;

  @ApiProperty({ example: 245, required: false })
  distanceMeters?: number;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440002',
    nullable: true,
  })
  routeId!: string | null;

  @ApiProperty({ example: '1', nullable: true })
  routeName!: string | null;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440003',
    nullable: true,
  })
  tripId!: string | null;

  @ApiProperty({ example: 'Blok M', required: false })
  headsign?: string;

  @ApiProperty({ example: 28800, required: false })
  departureTimeSeconds?: number;

  @ApiProperty({ example: 29100, required: false })
  arrivalTimeSeconds?: number;

  @ApiPropertyOptional({
    description: 'Road geometry for the leg, encoded as polyline6',
    example: 'v{lwJwkxvjEg{CfpAozDn}@gzn@ffF',
  })
  geometry?: string;

  @ApiPropertyOptional({
    type: [RouteAlternativeDto],
    description: 'Other routes serving the same stop-to-stop transit segment',
  })
  alternativeRoutes?: RouteAlternativeDto[];
}
