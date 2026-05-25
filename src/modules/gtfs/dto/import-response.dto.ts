import { ApiProperty } from '@nestjs/swagger';
import { ImportSummaryDto } from './import-summary.dto';

export class ImportResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  feedSourceId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  importJobId: string;

  @ApiProperty()
  summary: ImportSummaryDto;

  @ApiProperty({ example: [] })
  errors: string[];
}
