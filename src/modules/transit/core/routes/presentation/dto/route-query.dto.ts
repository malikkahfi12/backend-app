import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class RouteQueryDto {
  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsString()
  agencyId?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440001' })
  @IsOptional()
  @IsString()
  transitModeId?: string;

  @ApiPropertyOptional({ example: 'ID' })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional({ example: 'JKT' })
  @IsOptional()
  @IsString()
  regionCode?: string;

  @ApiPropertyOptional({ example: 'BRT' })
  @IsOptional()
  @IsString()
  mode?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440002' })
  @IsOptional()
  @IsString()
  operatorId?: string;

  @ApiPropertyOptional({ example: 'true' })
  @IsOptional()
  @Transform(({ value }: { value: string }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: '20' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsInt()
  @Min(1)
  page?: number;
}
