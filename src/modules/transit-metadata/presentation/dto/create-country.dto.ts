import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateCountryDto {
  @ApiProperty({ example: 'ID' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9_]+$/)
  code!: string;

  @ApiProperty({ example: 'Indonesia' })
  @IsString()
  @IsNotEmpty()
  name!: string;
}
