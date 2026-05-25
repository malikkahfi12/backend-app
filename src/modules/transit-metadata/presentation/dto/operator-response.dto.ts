import { ApiProperty } from '@nestjs/swagger';
import { OperatorType } from '../../domain/enums/operator-type.enum';

export class OperatorResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  regionId: string;

  @ApiProperty({ example: 'MRT_JAKARTA' })
  code: string;

  @ApiProperty({ example: 'MRT Jakarta' })
  name: string;

  @ApiProperty({ enum: OperatorType, example: OperatorType.GOVERNMENT })
  type: OperatorType;

  @ApiProperty({ example: 'https://jakartamrt.co.id', nullable: true })
  websiteUrl: string | null;
}
