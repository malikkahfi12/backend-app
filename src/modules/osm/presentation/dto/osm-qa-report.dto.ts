import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OsmQaIssueDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  routeId!: string;

  @ApiProperty({ example: 'KRL Commuter Line Bogor' })
  routeName!: string;

  @ApiProperty({ example: '12345678' })
  osmId!: string;

  @ApiProperty({ example: 'rail' })
  transitMode!: string;

  @ApiProperty({ example: ['large_gaps', 'duplicate_stops'] })
  failedChecks!: string[];

  @ApiPropertyOptional({ example: { large_gaps: [] } })
  details?: Record<string, unknown>;
}

export class OsmQaReportDto {
  @ApiProperty({ example: 38 })
  totalRoutesChecked!: number;

  @ApiProperty({ type: [OsmQaIssueDto] })
  issues!: OsmQaIssueDto[];
}
