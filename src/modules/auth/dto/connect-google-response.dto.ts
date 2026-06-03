import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConnectGoogleDataDto {
  @ApiProperty({ example: 'google' })
  provider!: string;

  @ApiProperty({ example: '1234567890' })
  providerUserId!: string;

  @ApiPropertyOptional({ example: 'user@gmail.com', nullable: true })
  email!: string | null;
}

export class ConnectGoogleResponseDto {
  @ApiProperty({ type: ConnectGoogleDataDto })
  data!: ConnectGoogleDataDto;
}
