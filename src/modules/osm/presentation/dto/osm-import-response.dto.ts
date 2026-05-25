import { ApiProperty } from '@nestjs/swagger';

export class OsmImportResponseDto {
  @ApiProperty({ example: 150 })
  totalFetched!: number;

  @ApiProperty({ example: 145 })
  imported!: number;

  @ApiProperty({ example: 5 })
  skipped!: number;

  @ApiProperty({ example: ['Failed to upsert node/999: ...'] })
  errors!: string[];
}
