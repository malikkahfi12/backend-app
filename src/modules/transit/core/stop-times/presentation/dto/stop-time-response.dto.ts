import { ApiProperty } from '@nestjs/swagger';

export class StopTimeResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  tripId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  stopId: string;

  @ApiProperty({ example: 1 })
  stopSequence: number;

  @ApiProperty({ example: '08:00:00' })
  arrivalTime: string;

  @ApiProperty({ example: '08:01:00' })
  departureTime: string;

  @ApiProperty({ example: 28800, nullable: true })
  arrivalSeconds: number | null;

  @ApiProperty({ example: 28860, nullable: true })
  departureSeconds: number | null;

  @ApiProperty({ example: 0, nullable: true })
  pickupType: number | null;

  @ApiProperty({ example: 0, nullable: true })
  dropOffType: number | null;
}
