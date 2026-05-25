import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
} from 'class-validator';
import { OperatorType } from '../../domain/enums/operator-type.enum';

export class CreateOperatorDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  regionId!: string;

  @ApiProperty({ example: 'MRT_JAKARTA' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9_]+$/)
  code!: string;

  @ApiProperty({ example: 'MRT Jakarta' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ enum: OperatorType, example: OperatorType.GOVERNMENT })
  @IsEnum(OperatorType)
  type!: OperatorType;

  @ApiPropertyOptional({ example: 'https://jakartamrt.co.id' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  websiteUrl?: string;
}
