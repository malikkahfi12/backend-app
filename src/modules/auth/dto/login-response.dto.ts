import { ApiProperty } from '@nestjs/swagger';
import { RegisterDeviceUserResponseDto } from './register-device-response.dto';

class LoginDeviceResponseDto {
  @ApiProperty({ example: '660e8400-e29b-41d4-a716-446655440001' })
  id!: string;

  @ApiProperty({ example: 'iPhone 17 Pro', nullable: true })
  deviceName!: string | null;

  @ApiProperty({ example: 'ios', nullable: true })
  platform!: string | null;

  @ApiProperty({
    example: '2025-05-29T12:00:00.000Z',
    nullable: true,
  })
  lastSeenAt!: string | null;
}

class LoginDataDto {
  @ApiProperty({ type: RegisterDeviceUserResponseDto })
  user!: RegisterDeviceUserResponseDto;

  @ApiProperty({ type: LoginDeviceResponseDto })
  device!: LoginDeviceResponseDto;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...' })
  accessToken!: string;

  @ApiProperty({ example: 'dGVzdC11dWlk.test-random-bytes-base64url' })
  refreshToken!: string;
}

class LoginMetaDto {
  @ApiProperty({ example: 900 })
  accessTokenExpiresIn!: number;
}

export class LoginResponseDto {
  @ApiProperty({ type: LoginDataDto })
  data!: LoginDataDto;

  @ApiProperty({ type: LoginMetaDto })
  meta!: LoginMetaDto;
}
