import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StopResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  feedSourceId: string | null;

  @ApiProperty({ example: 'stop-bundaran-hi', nullable: true })
  externalStopId: string | null;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  regionId: string;

  @ApiProperty({ example: 'ST001', nullable: true })
  code: string | null;

  @ApiProperty({ example: 'Bundaran HI' })
  name: string;

  @ApiProperty({ example: 'bundaran-hi' })
  slug: string;

  @ApiProperty({ example: -6.2 })
  latitude: number;

  @ApiProperty({ example: 106.8 })
  longitude: number;

  @ApiProperty({ example: 'Jl. MH Thamrin, Jakarta', nullable: true })
  address: string | null;

  @ApiProperty({ example: 1, nullable: true })
  locationType: number | null;

  @ApiProperty({ example: true })
  isStation: boolean;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    nullable: true,
  })
  parentStationId: string | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiPropertyOptional({ example: '12345678', nullable: true })
  osmId?: string | null;

  @ApiPropertyOptional({ example: 'node', nullable: true })
  osmType?: string | null;

  @ApiPropertyOptional({ example: 'rail', nullable: true })
  mode?: string | null;
}
