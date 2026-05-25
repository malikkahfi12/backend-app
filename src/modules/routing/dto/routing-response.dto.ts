import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RouteOptionDto } from './route-option.dto';

export class RoutingResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  fromStopId!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  toStopId!: string;

  @ApiPropertyOptional({ example: 'Harmoni' })
  fromStopName?: string;

  @ApiPropertyOptional({ example: 'Kota' })
  toStopName?: string;

  @ApiPropertyOptional({ example: 28800 })
  departureTimeSeconds?: number;

  @ApiProperty({ type: [RouteOptionDto] })
  options!: RouteOptionDto[];
}
