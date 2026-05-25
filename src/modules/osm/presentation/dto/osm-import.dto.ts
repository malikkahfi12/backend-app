import { IsNotEmpty, IsString } from 'class-validator';

export class OsmImportDto {
  @IsString()
  @IsNotEmpty()
  regionId!: string;

  @IsString()
  @IsNotEmpty()
  bbox!: string;
}
