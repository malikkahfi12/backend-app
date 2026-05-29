import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LogoutRequestDto {
  @ApiProperty({
    description: 'Refresh token to revoke',
    example: 'dGVzdC11dWlk.test-random-bytes-base64url',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
