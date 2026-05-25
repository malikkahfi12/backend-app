import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateRegionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  countryId!: string;

  @ApiProperty({ example: 'JKT' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9_]+$/)
  code!: string;

  @ApiProperty({ example: 'Jakarta' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'Asia/Jakarta' })
  @IsString()
  @IsNotEmpty()
  timezone!: string;

  @ApiProperty({ example: 'id-ID' })
  @IsString()
  @IsNotEmpty()
  defaultLocale!: string;
}
