import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDeviceUserResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'malik' })
  username!: string;

  @ApiProperty({ example: 'Malik' })
  displayName!: string;

  @ApiPropertyOptional({ example: null, nullable: true })
  avatarUrl!: string | null;

  @ApiProperty({
    example: 'M',
    description: 'Computed initials from displayName (max 2 chars)',
  })
  avatarInitials!: string;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: '2025-05-29T12:00:00.000Z' })
  createdAt!: string;
}

export class RegisterDeviceDeviceResponseDto {
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
}

export class RegisterDeviceDataDto {
  @ApiProperty({ type: RegisterDeviceUserResponseDto })
  user!: RegisterDeviceUserResponseDto;

  @ApiProperty({ type: RegisterDeviceDeviceResponseDto })
  device!: RegisterDeviceDeviceResponseDto;

  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIs...',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'Opaque refresh token',
    example: 'dGVzdC11dWlk.test-random-bytes-base64url',
  })
  refreshToken!: string;
}

export class RegisterDeviceMetaDto {
  @ApiProperty({ example: 900 })
  accessTokenExpiresIn!: number;
}

export class RegisterDeviceResponseDto {
  @ApiProperty({ type: RegisterDeviceDataDto })
  data!: RegisterDeviceDataDto;

  @ApiProperty({ type: RegisterDeviceMetaDto })
  meta!: RegisterDeviceMetaDto;
}
