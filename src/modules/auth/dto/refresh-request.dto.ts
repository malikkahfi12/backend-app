import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshRequestDto {
  @ApiProperty({
    description: 'Refresh token to rotate',
    example: 'dGVzdC11dWlk.test-random-bytes-base64url',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
