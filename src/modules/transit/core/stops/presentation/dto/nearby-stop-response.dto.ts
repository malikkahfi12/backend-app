import { ApiProperty } from '@nestjs/swagger';

export class NearbyStopResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'Harmoni' })
  name!: string;

  @ApiProperty({ example: 'HARMONI', nullable: true })
  code!: string | null;

  @ApiProperty({ example: -6.1675 })
  latitude!: number;

  @ApiProperty({ example: 106.8203 })
  longitude!: number;

  @ApiProperty({ example: 1, nullable: true })
  locationType!: number | null;

  @ApiProperty({ example: true })
  isStation!: boolean;

  @ApiProperty({ example: 245.5 })
  distance_meters!: number;
}
