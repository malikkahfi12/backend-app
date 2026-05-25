import { ApiProperty } from '@nestjs/swagger';

export class OsmRouteImportResponseDto {
  @ApiProperty({ example: 45 })
  totalRelations!: number;

  @ApiProperty({ example: 38 })
  importedRoutes!: number;

  @ApiProperty({ example: 5 })
  skippedRoutes!: number;

  @ApiProperty({ example: 152 })
  createdRouteStops!: number;

  @ApiProperty({ example: 12 })
  unmatchedStops!: number;

  @ApiProperty({ example: ['Failed to import relation/999: ...'] })
  errors!: string[];
}
