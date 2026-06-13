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

export class UnifiedSearchQueryDto {
  @ApiProperty({
    example: 'bandung',
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
    description: 'Maximum number of results per source (1-10)',
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsNumber()
  @Min(1)
  @Max(10)
  limit?: number = 5;

  @ApiPropertyOptional({
    example: '106.80,-6.28,106.85,-6.20',
    description:
      'Bounding box to limit search area: minLng,minLat,maxLng,maxLat',
  })
  @IsOptional()
  @IsString()
  bbox?: string;

  @ApiPropertyOptional({
    example: 'poi,address,locality',
    default: 'poi,address,locality',
    description:
      'Comma-separated StadiaMaps v2 layers (e.g., poi,address,locality,street,neighbourhood)',
  })
  @IsOptional()
  @IsString()
  layers?: string = 'poi,address,locality';

  @ApiPropertyOptional({
    example: 'id',
    description:
      'BCP47 language tag for localized geocoding results (e.g., id, en, ko)',
  })
  @IsOptional()
  @IsString()
  lang?: string;

  get parsedBbox(): {
    minLng: number;
    minLat: number;
    maxLng: number;
    maxLat: number;
  } | null {
    if (!this.bbox) return null;

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
