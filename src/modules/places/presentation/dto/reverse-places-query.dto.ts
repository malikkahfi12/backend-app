import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNumber } from 'class-validator';
import { IsLatitude, IsLongitude } from '../../../../common/validators';

export class ReversePlacesQueryDto {
  @ApiProperty({
    example: -6.2,
    description: 'Latitude (-90 to 90)',
  })
  @Transform(({ value }) => parseFloat(value as string))
  @IsNumber()
  @IsLatitude()
  lat!: number;

  @ApiProperty({
    example: 106.8,
    description: 'Longitude (-180 to 180)',
  })
  @Transform(({ value }) => parseFloat(value as string))
  @IsNumber()
  @IsLongitude()
  lng!: number;
}
