import { ApiProperty } from '@nestjs/swagger';

export class RecoveryGoogleDataDto {
  @ApiProperty({
    description: 'Short-lived JWT recovery token (10 minute expiry)',
    example: 'eyJhbGciOiJIUzI1NiIs...',
  })
  recoveryToken!: string;
}

export class RecoveryGoogleResponseDto {
  @ApiProperty({ type: RecoveryGoogleDataDto })
  data!: RecoveryGoogleDataDto;
}
