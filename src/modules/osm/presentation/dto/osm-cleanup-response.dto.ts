import { ApiProperty } from '@nestjs/swagger';

export class OsmCleanupResponseDto {
  @ApiProperty({ example: false })
  dryRun!: boolean;

  @ApiProperty({ example: 12 })
  duplicateStopsRemoved!: number;

  @ApiProperty({ example: 3 })
  routesDisabled!: number;

  @ApiProperty({ example: ['Failed to clean route/abc: ...'] })
  errors!: string[];
}
