import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  Matches,
} from 'class-validator';
import { IsLatitude, IsLongitude } from '../../../../../../common/validators';

export class CreateStopDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  @IsNotEmpty()
  regionId!: string;

  @ApiPropertyOptional({ example: 'ST001' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ example: 'Bundaran HI' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'bundaran-hi' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/)
  slug!: string;

  @ApiProperty({ example: -6.2 })
  @IsNumber()
  @IsLatitude()
  latitude!: number;

  @ApiProperty({ example: 106.8 })
  @IsNumber()
  @IsLongitude()
  longitude!: number;

  @ApiPropertyOptional({ example: 'Jl. MH Thamrin, Jakarta' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isStation?: boolean;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440001' })
  @IsOptional()
  @IsString()
  parentStationId?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
