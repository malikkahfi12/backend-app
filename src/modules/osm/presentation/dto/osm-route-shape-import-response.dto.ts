import { ApiProperty } from '@nestjs/swagger';

export class OsmRouteShapeImportResponseDto {
  @ApiProperty({ example: 42 })
  totalRoutes!: number;

  @ApiProperty({ example: 38 })
  updated!: number;

  @ApiProperty({ example: 3 })
  skipped!: number;

  @ApiProperty({ example: 1 })
  failed!: number;

  @ApiProperty({ example: ['Failed geometry for rel/999: ...'] })
  errors!: string[];
}
