import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IsValidHexColor } from '../../../../../../common/validators';

export class CreateRouteDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  @IsNotEmpty()
  agencyId!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  @IsString()
  @IsNotEmpty()
  transitModeId!: string;

  @ApiProperty({ example: '1' })
  @IsString()
  @IsNotEmpty()
  shortName!: string;

  @ApiProperty({ example: 'Koridor 1: Blok M — Kota' })
  @IsString()
  @IsNotEmpty()
  longName!: string;

  @ApiPropertyOptional({ example: 'Main north-south corridor' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'FF0000' })
  @IsOptional()
  @IsValidHexColor()
  color?: string;

  @ApiPropertyOptional({ example: 'FFFFFF' })
  @IsOptional()
  @IsValidHexColor()
  textColor?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
