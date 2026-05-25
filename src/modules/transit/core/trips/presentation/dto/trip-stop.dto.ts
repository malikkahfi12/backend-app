import { ApiProperty } from '@nestjs/swagger';

export class TripStopDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  stopId!: string;

  @ApiProperty({ example: 'Harmoni' })
  stopName!: string;

  @ApiProperty({ example: 1 })
  stopSequence!: number;

  @ApiProperty({ example: -6.1675 })
  latitude!: number;

  @ApiProperty({ example: 106.8203 })
  longitude!: number;

  @ApiProperty({ example: '05:30:00' })
  arrivalTime!: string;

  @ApiProperty({ example: '05:30:30' })
  departureTime!: string;
}
