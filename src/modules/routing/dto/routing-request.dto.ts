import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class RoutingRequestDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsOptional()
  @IsString()
  fromStopId?: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    required: false,
  })
  @IsOptional()
  @IsString()
  toStopId?: string;

  @ApiPropertyOptional({ example: 'Harmoni' })
  @IsOptional()
  @IsString()
  fromStopName?: string;

  @ApiPropertyOptional({ example: 'Kota' })
  @IsOptional()
  @IsString()
  toStopName?: string;

  @ApiPropertyOptional({ example: 28800 })
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  @IsNumber()
  @Min(0)
  departureTimeSeconds?: number;
}
