import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ImportGtfsDto {
  @ApiProperty({ example: 'mrt-jakarta' })
  @IsString()
  @IsNotEmpty()
  source!: string;

  @ApiProperty({ example: 'ID' })
  @IsString()
  @IsNotEmpty()
  countryCode!: string;

  @ApiProperty({ example: 'jakarta' })
  @IsString()
  @IsNotEmpty()
  regionCode!: string;
}

export class ImportSummaryResponseDto {
  @ApiProperty({ example: 1 })
  agenciesImported!: number;

  @ApiProperty({ example: 25 })
  stopsImported!: number;

  @ApiProperty({ example: 2 })
  routesImported!: number;

  @ApiProperty({ example: 3 })
  calendarsImported!: number;

  @ApiProperty({ example: 1200 })
  tripsImported!: number;

  @ApiProperty({ example: 42000 })
  stopTimesImported!: number;

  @ApiProperty({ example: 0 })
  calendarDatesImported!: number;

  @ApiProperty({ example: [] })
  warnings!: string[];

  @ApiProperty({ example: [] })
  errors!: string[];
}

export class ImportGtfsResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'mrt-jakarta' })
  source!: string;

  @ApiProperty()
  summary!: ImportSummaryResponseDto;
}
