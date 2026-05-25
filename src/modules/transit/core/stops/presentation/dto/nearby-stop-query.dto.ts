import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class NearbyStopQueryDto {
  @ApiProperty({ example: -6.1675 })
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @IsLatitude()
  lat!: number;

  @ApiProperty({ example: 106.8203 })
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @IsLongitude()
  lng!: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(50)
  @Max(5000)
  radius?: number;
}
