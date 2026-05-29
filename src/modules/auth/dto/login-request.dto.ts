import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginRequestDto {
  @ApiProperty({
    description: 'Challenge record ID',
    example: '770e8400-e29b-41d4-a716-446655440002',
  })
  @IsString()
  @IsNotEmpty()
  challengeId!: string;

  @ApiProperty({
    description: 'Base64url-encoded Ed25519 signature of the challenge',
    example: 'dGhpcyBpcyBhIHNpZ25hdHVyZQ',
  })
  @IsString()
  @IsNotEmpty()
  signature!: string;
}
