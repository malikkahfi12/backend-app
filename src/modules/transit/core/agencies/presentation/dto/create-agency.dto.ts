import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreateAgencyDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  @IsNotEmpty()
  regionId!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  @IsString()
  @IsNotEmpty()
  operatorId!: string;

  @ApiProperty({ example: 'TransJakarta' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'transjakarta' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/)
  slug!: string;

  @ApiProperty({ example: 'Asia/Jakarta' })
  @IsString()
  @IsNotEmpty()
  timezone!: string;

  @ApiPropertyOptional({ example: 'id' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ example: '+62211500' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'https://transjakarta.co.id' })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
