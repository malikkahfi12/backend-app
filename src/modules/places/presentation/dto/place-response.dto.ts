import { ApiProperty } from '@nestjs/swagger';

export class SearchPlaceResultDto {
  @ApiProperty({
    example: 'place:12345',
    description: 'Normalized place identifier',
  })
  id!: string;

  @ApiProperty({
    example: 'Gedung Sate',
    description: 'Place name',
  })
  name!: string;

  @ApiProperty({
    example: 'Bandung, Jawa Barat, Indonesia',
    description: 'Full address string',
  })
  address!: string;

  @ApiProperty({
    example: -6.902,
    description: 'Latitude',
  })
  latitude!: number;

  @ApiProperty({
    example: 107.618,
    description: 'Longitude',
  })
  longitude!: number;

  @ApiProperty({
    example: 'place',
    description: 'Result type',
  })
  type!: string;

  @ApiProperty({
    example: 'stadiamaps',
    description: 'Data provider name',
  })
  provider!: string;
}

export class ReversePlaceResultDto {
  @ApiProperty({
    example: 'Jl. Sudirman',
    description: 'Place or address name',
  })
  name!: string;

  @ApiProperty({
    example: 'Jakarta Pusat, Jakarta, Indonesia',
    description: 'Full address string',
  })
  address!: string;

  @ApiProperty({
    example: -6.2,
    description: 'Latitude',
  })
  latitude!: number;

  @ApiProperty({
    example: 106.8,
    description: 'Longitude',
  })
  longitude!: number;

  @ApiProperty({
    example: 'stadiamaps',
    description: 'Data provider name',
  })
  provider!: string;
}
