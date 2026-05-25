import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateTransitModeDto {
  @ApiProperty({ example: 'MRT' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9_]+$/)
  code!: string;

  @ApiProperty({ example: 'Mass Rapid Transit' })
  @IsString()
  @IsNotEmpty()
  name!: string;
}
