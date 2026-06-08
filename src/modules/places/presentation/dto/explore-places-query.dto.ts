import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class ExplorePlacesQueryDto {
  @ApiProperty({
    example: '106.80,-6.25,106.85,-6.20',
    description: 'Bounding box: minLng,minLat,maxLng,maxLat',
  })
  @IsString()
  bbox!: string;

  @ApiPropertyOptional({
    example: 'coffee',
    description:
      'Place category (food, coffee, shopping, attractions, parks, etc.)',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    example: 20,
    default: 20,
    description: 'Maximum number of results (1-50)',
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  get parsedBbox(): {
    minLng: number;
    minLat: number;
    maxLng: number;
    maxLat: number;
  } {
    const parts = this.bbox.split(',').map((s) => {
      const n = parseFloat(s.trim());
      if (isNaN(n)) {
        throw new Error(`Invalid bbox coordinate: "${s}"`);
      }
      return n;
    });

    if (parts.length !== 4) {
      throw new Error(
        'bbox must contain exactly 4 comma-separated values: minLng,minLat,maxLng,maxLat',
      );
    }

    const [minLng, minLat, maxLng, maxLat] = parts;

    if (minLng < -180 || minLng > 180 || maxLng < -180 || maxLng > 180) {
      throw new Error('Longitude must be between -180 and 180');
    }

    if (minLat < -90 || minLat > 90 || maxLat < -90 || maxLat > 90) {
      throw new Error('Latitude must be between -90 and 90');
    }

    if (minLng >= maxLng) {
      throw new Error('minLng must be less than maxLng');
    }

    if (minLat >= maxLat) {
      throw new Error('minLat must be less than maxLat');
    }

    return { minLng, minLat, maxLng, maxLat };
  }
}
