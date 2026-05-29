import { ApiProperty } from '@nestjs/swagger';

export class TokenResponseDto {
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

  @ApiProperty({
    description: 'Access token expiry in seconds',
    example: 900,
  })
  accessTokenExpiresIn!: number;
}
