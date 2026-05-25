import { ApiProperty } from '@nestjs/swagger';

export class ImportSummaryDto {
  @ApiProperty({ example: 1 })
  agencies: number;

  @ApiProperty({ example: 5 })
  routes: number;

  @ApiProperty({ example: 50 })
  stops: number;

  @ApiProperty({ example: 100 })
  trips: number;

  @ApiProperty({ example: 2000 })
  stopTimes: number;

  @ApiProperty({ example: 2 })
  calendars: number;
}
