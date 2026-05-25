import { ApiProperty } from '@nestjs/swagger';
import { RoutingEdgeType } from '../enums/routing-edge-type.enum';

export class RoutingEdgeDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  toStopId!: string;

  @ApiProperty({ enum: RoutingEdgeType, example: RoutingEdgeType.WALK })
  type!: RoutingEdgeType;

  @ApiProperty({ example: 245, required: false })
  distanceMeters?: number;

  @ApiProperty({ example: 205, required: false })
  walkingTimeSeconds?: number;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    required: false,
  })
  routeId?: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440002',
    required: false,
  })
  tripId?: string;

  @ApiProperty({ example: 28800, required: false })
  departureTimeSeconds?: number;

  @ApiProperty({ example: 29100, required: false })
  arrivalTimeSeconds?: number;

  @ApiProperty({ example: 300, required: false })
  travelTimeSeconds?: number;
}
