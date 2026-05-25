import { IsOptional, IsString, IsBoolean, IsArray } from 'class-validator';

export class OsmCleanupDto {
  @IsOptional()
  @IsString()
  regionId?: string;

  @IsOptional()
  @IsBoolean()
  removeDuplicateStops?: boolean;

  @IsOptional()
  @IsBoolean()
  disableUnusable?: boolean;

  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  disabledChecks?: string[];
}
