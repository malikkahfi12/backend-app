import { ApiProperty } from '@nestjs/swagger';

export class StopRouteDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  routeId!: string;

  @ApiProperty({ example: 'Corridor 1' })
  routeName!: string;

  @ApiProperty({ example: 'BRT' })
  mode!: string;

  @ApiProperty({ example: 'Blok M' })
  headsign!: string;
}
