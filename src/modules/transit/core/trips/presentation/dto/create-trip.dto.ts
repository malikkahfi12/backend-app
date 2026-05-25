import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateTripDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  @IsNotEmpty()
  routeId!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  @IsString()
  @IsNotEmpty()
  serviceId!: string;

  @ApiProperty({ example: 'Blok M' })
  @IsString()
  @IsNotEmpty()
  headsign!: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  directionId?: number;

  @ApiPropertyOptional({ example: 'block-1' })
  @IsOptional()
  @IsString()
  blockId?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
