import { ApiProperty } from '@nestjs/swagger';

export class ChallengeDataDto {
  @ApiProperty({
    description: 'Challenge record ID',
    example: '770e8400-e29b-41d4-a716-446655440002',
  })
  challengeId!: string;

  @ApiProperty({
    description: 'Base64url-encoded random challenge bytes',
    example: 'dGhpcyBpcyBhIHJhbmRvbSBjaGFsbGVuZ2U',
  })
  challenge!: string;

  @ApiProperty({
    description: 'ISO 8601 expiry timestamp',
    example: '2025-05-29T12:05:00.000Z',
  })
  expiresAt!: string;
}

export class ChallengeResponseDto {
  @ApiProperty({ type: ChallengeDataDto })
  data!: ChallengeDataDto;
}
