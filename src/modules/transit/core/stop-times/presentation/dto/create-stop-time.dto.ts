import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { IsGtfsTime } from '../../../../../../common/validators';

export class CreateStopTimeDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  @IsNotEmpty()
  tripId!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  @IsString()
  @IsNotEmpty()
  stopId!: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(0)
  stopSequence!: number;

  @ApiProperty({ example: '08:00:00' })
  @IsString()
  @IsNotEmpty()
  @IsGtfsTime()
  arrivalTime!: string;

  @ApiProperty({ example: '08:01:00' })
  @IsString()
  @IsNotEmpty()
  @IsGtfsTime()
  departureTime!: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  pickupType?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  dropOffType?: number;
}
