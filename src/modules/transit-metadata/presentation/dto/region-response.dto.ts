import { ApiProperty } from '@nestjs/swagger';

export class RegionResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  countryId: string;

  @ApiProperty({ example: 'JKT' })
  code: string;

  @ApiProperty({ example: 'Jakarta' })
  name: string;

  @ApiProperty({ example: 'Asia/Jakarta' })
  timezone: string;

  @ApiProperty({ example: 'id-ID' })
  defaultLocale: string;
}
