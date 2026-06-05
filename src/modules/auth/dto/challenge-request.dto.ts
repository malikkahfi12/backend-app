import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

export class ChallengeRequestDto {
  @ApiProperty({
    description: 'Username of the user to challenge',
    example: 'lika',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({
    description: 'Device ID to authenticate',
    example: '660e8400-e29b-41d4-a716-446655440001',
  })
  @IsString()
  @IsNotEmpty()
  deviceId!: string;
}
