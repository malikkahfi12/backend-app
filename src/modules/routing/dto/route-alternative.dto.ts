import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RouteAlternativeDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440002' })
  routeId!: string;

  @ApiPropertyOptional({ example: '5C' })
  routeName?: string;
}
