import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class BatchDepartureRequestDto {
  @ApiProperty({ example: ['550e8400-e29b-41d4-a716-446655440000'] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  stops!: string[];

  @ApiPropertyOptional({ example: '08:00:00' })
  @IsOptional()
  @IsString()
  currentTime?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  limit?: number;
}
