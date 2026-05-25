import {
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class OsmGeometryMatchDto {
  @IsNotEmpty()
  regionId!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  confidenceThreshold?: number;

  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  @IsOptional()
  @IsBoolean()
  replaceLowQuality?: boolean;
}
