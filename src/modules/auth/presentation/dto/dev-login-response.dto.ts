import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DevLoginUserDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'dev' })
  username!: string;

  @ApiProperty({ example: 'Developer' })
  displayName!: string;

  @ApiPropertyOptional({ example: null, nullable: true })
  avatarUrl!: string | null;

  @ApiProperty({ example: 'DE' })
  avatarInitials!: string;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: '2026-06-08T12:00:00.000Z' })
  createdAt!: string;
}

export class DevLoginDataDto {
  @ApiProperty({ type: DevLoginUserDto })
  user!: DevLoginUserDto;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...' })
  accessToken!: string;

  @ApiProperty({ example: 'dGVzdC11dWlk.test-random-bytes-base64url' })
  refreshToken!: string;
}

export class DevLoginMetaDto {
  @ApiProperty({ example: 3153600000, description: 'Access token expiry dalam detik (100 tahun)' })
  accessTokenExpiresIn!: number;

  @ApiProperty({ example: '2126-06-08T12:00:00.000Z', description: 'Refresh token kadaluarsa (100 tahun)' })
  refreshTokenExpiresAt!: string;
}

export class DevLoginResponseDto {
  @ApiProperty({ type: DevLoginDataDto })
  data!: DevLoginDataDto;

  @ApiProperty({ type: DevLoginMetaDto })
  meta!: DevLoginMetaDto;
}
