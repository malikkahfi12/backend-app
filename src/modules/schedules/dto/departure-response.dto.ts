import { ApiProperty } from '@nestjs/swagger';

export class DepartureResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  tripId!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  routeId!: string;

  @ApiProperty({ example: 'Corridor 1' })
  routeName!: string;

  @ApiProperty({ example: 'Blok M' })
  headsign!: string;

  @ApiProperty({ example: '08:15:00' })
  departureTime!: string;

  @ApiProperty({ example: 29700 })
  departureSeconds!: number;

  @ApiProperty({ example: 'BRT' })
  mode!: string;

  @ApiProperty({ example: 'Harmoni', required: false })
  stopName?: string;
}
