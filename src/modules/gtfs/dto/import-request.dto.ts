import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ImportRequestDto {
  @ApiProperty({ example: './data/gtfs/jakarta/mrt' })
  @IsString()
  @IsNotEmpty()
  path!: string;
}
