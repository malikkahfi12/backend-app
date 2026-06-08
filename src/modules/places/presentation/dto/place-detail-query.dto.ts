import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class PlaceDetailQueryDto {
  @ApiProperty({
    example: 'openstreetmap:venue:way/123',
    description: 'Stadia Maps GID',
  })
  @IsString()
  @MinLength(1)
  id!: string;
}
