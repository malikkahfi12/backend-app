import { ApiProperty } from '@nestjs/swagger';

export class ExplorePlaceItemDto {
  @ApiProperty({
    example: 'openstreetmap:venue:way/123',
    description: 'Globally unique place identifier',
  })
  id!: string;

  @ApiProperty({
    example: 'openstreetmap',
    description: 'Data source name',
  })
  source!: string;

  @ApiProperty({
    example: 'Kopi Tuku Cipete',
    description: 'Place name',
  })
  name!: string;

  @ApiProperty({
    example: 'Jl. Cipete Raya No. 14, Jakarta Selatan',
    description: 'Formatted address',
  })
  address!: string;

  @ApiProperty({
    example: -6.2714,
    description: 'Latitude',
  })
  lat!: number;

  @ApiProperty({
    example: 106.8102,
    description: 'Longitude',
  })
  lng!: number;
}
