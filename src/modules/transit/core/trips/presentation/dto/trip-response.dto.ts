import { ApiProperty } from '@nestjs/swagger';

export class TripResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  feedSourceId: string | null;

  @ApiProperty({ example: 'trip-1', nullable: true })
  externalTripId: string | null;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  routeId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  serviceId: string;

  @ApiProperty({ example: 'Blok M' })
  headsign: string;

  @ApiProperty({ example: 0, nullable: true })
  directionId: number | null;

  @ApiProperty({ example: 'block-1', nullable: true })
  blockId: string | null;

  @ApiProperty({ example: true })
  isActive: boolean;
}
