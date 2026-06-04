import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RecoveryGoogleRequestDto {
  @ApiProperty({
    description: 'Google ID token from the client SDK',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjFmZGE2N2I5ZjQxMjI3M2Q1N2ZmOGU3...',
  })
  @IsString()
  @IsNotEmpty()
  idToken!: string;
}
