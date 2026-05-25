import { ApiProperty } from '@nestjs/swagger';

export class AgencyResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  feedSourceId: string | null;

  @ApiProperty({ example: 'org-mrt-jakarta', nullable: true })
  externalAgencyId: string | null;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  regionId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  operatorId: string;

  @ApiProperty({ example: 'TransJakarta' })
  name: string;

  @ApiProperty({ example: 'transjakarta' })
  slug: string;

  @ApiProperty({ example: 'Asia/Jakarta' })
  timezone: string;

  @ApiProperty({ example: 'id' })
  language: string;

  @ApiProperty({ example: '+62211500', nullable: true })
  phone: string | null;

  @ApiProperty({ example: 'https://transjakarta.co.id', nullable: true })
  website: string | null;

  @ApiProperty({ example: true })
  isActive: boolean;
}
