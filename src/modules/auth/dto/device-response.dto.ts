import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DeviceItemDto {
  @ApiProperty({ example: '660e8400-e29b-41d4-a716-446655440001' })
  id!: string;

  @ApiPropertyOptional({
    example: 'iPhone 17 Pro',
    nullable: true,
  })
  deviceName!: string | null;

  @ApiPropertyOptional({ example: 'ios', nullable: true })
  platform!: string | null;

  @ApiPropertyOptional({
    example: '2025-05-29T12:00:00.000Z',
    nullable: true,
  })
  lastSeenAt!: string | null;

  @ApiProperty({ example: '2025-05-29T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: true })
  isCurrent!: boolean;
}

export class DeviceListDataDto {
  @ApiProperty({ type: [DeviceItemDto] })
  devices!: DeviceItemDto[];
}

export class DeviceListResponseDto {
  @ApiProperty({ type: DeviceListDataDto })
  data!: DeviceListDataDto;
}

export class DeviceRevokeDataDto {
  @ApiProperty({ example: 'Device revoked successfully' })
  message!: string;
}

export class DeviceRevokeResponseDto {
  @ApiProperty({ type: DeviceRevokeDataDto })
  data!: DeviceRevokeDataDto;
}
