import { ApiProperty } from '@nestjs/swagger';

export class CountryResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'ID' })
  code: string;

  @ApiProperty({ example: 'Indonesia' })
  name: string;
}
