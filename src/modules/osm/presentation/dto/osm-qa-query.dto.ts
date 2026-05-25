import { IsOptional, IsString, IsArray, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class OsmQaQueryDto {
  @IsOptional()
  @IsString()
  regionId?: string;

  @IsOptional()
  @IsString()
  mode?: string;

  @IsOptional()
  @Transform(({ value }: { value: string }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Transform(({ value }: { value: string }) =>
    value ? value.split(',').filter(Boolean) : [],
  )
  @IsArray()
  @IsString({ each: true })
  checks?: string[];
}
