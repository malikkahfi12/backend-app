import { ApiProperty } from '@nestjs/swagger';

export class RecoveryRegisterDeviceDataDto {
  @ApiProperty({ example: '660e8400-e29b-41d4-a716-446655440001' })
  deviceId!: string;

  @ApiProperty({
    example: '770e8400-e29b-41d4-a716-446655440002',
  })
  challengeId!: string;

  @ApiProperty({
    example: 'dGhpcyBpcyBhIHJhbmRvbSBjaGFsbGVuZ2U',
  })
  challenge!: string;

  @ApiProperty({
    example: '2025-05-29T12:05:00.000Z',
  })
  expiresAt!: string;
}

export class RecoveryRegisterDeviceResponseDto {
  @ApiProperty({ type: RecoveryRegisterDeviceDataDto })
  data!: RecoveryRegisterDeviceDataDto;
}
