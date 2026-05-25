import { ApiProperty } from '@nestjs/swagger';

export class CalendarResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  feedSourceId: string | null;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  serviceId: string;

  @ApiProperty({ example: true })
  monday: boolean;

  @ApiProperty({ example: true })
  tuesday: boolean;

  @ApiProperty({ example: true })
  wednesday: boolean;

  @ApiProperty({ example: true })
  thursday: boolean;

  @ApiProperty({ example: true })
  friday: boolean;

  @ApiProperty({ example: false })
  saturday: boolean;

  @ApiProperty({ example: false })
  sunday: boolean;

  @ApiProperty({ example: '2026-01-01' })
  startDate: string;

  @ApiProperty({ example: '2026-12-31' })
  endDate: string;

  @ApiProperty({ example: true })
  isActive: boolean;
}
