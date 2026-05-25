import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class StopQueryDto {
  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsString()
  regionId?: string;

  @ApiPropertyOptional({ example: 'true' })
  @IsOptional()
  @Transform(({ value }: { value: string }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'true' })
  @IsOptional()
  @Transform(({ value }: { value: string }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  isStation?: boolean;

  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsNumber()
  locationType?: number;

  @ApiPropertyOptional({ example: 'harmoni' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  q?: string;
}
