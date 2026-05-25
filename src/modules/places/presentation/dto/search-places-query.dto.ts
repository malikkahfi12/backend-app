import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { IsLatitude, IsLongitude } from '../../../../common/validators';

export class SearchPlacesQueryDto {
  @ApiProperty({
    example: 'Gedung Sate',
    description: 'Search query text',
  })
  @IsString()
  @MinLength(1)
  q!: string;

  @ApiPropertyOptional({
    example: -6.902,
    description: 'Latitude for proximity bias (-90 to 90)',
  })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value as string))
  @IsNumber()
  @IsLatitude()
  lat?: number;

  @ApiPropertyOptional({
    example: 107.618,
    description: 'Longitude for proximity bias (-180 to 180)',
  })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value as string))
  @IsNumber()
  @IsLongitude()
  lng?: number;

  @ApiPropertyOptional({
    example: 5,
    default: 5,
    description: 'Maximum number of results (1-10)',
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsNumber()
  @Min(1)
  @Max(10)
  limit?: number = 5;
}
