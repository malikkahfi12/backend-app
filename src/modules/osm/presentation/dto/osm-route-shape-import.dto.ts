import { IsNotEmpty, IsString, IsOptional, IsArray } from 'class-validator';

export class OsmRouteShapeImportDto {
  @IsString()
  @IsNotEmpty()
  regionId!: string;

  @IsString()
  @IsNotEmpty()
  bbox!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  modes?: string[];
}
