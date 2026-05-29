import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDeviceDto {
  @ApiProperty({
    description: 'Unique username (lowercase letters, numbers, underscore, dot)',
    example: 'malik',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9_.]+$/, {
    message:
      'Username can only contain lowercase letters, numbers, underscore, and dot',
  })
  @MinLength(3)
  @MaxLength(30)
  username!: string;

  @ApiProperty({
    description: 'Display name',
    example: 'Malik',
  })
  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @ApiProperty({
    description:
      'Ed25519 public key encoded as base64url or base64',
    example: 'IADkYx5hPFZe5ckSnBCctH7DYF_vbgMjJeI1zQORrRI',
  })
  @IsString()
  @IsNotEmpty()
  publicKey!: string;

  @ApiPropertyOptional({
    description: 'Human-readable device name',
    example: 'iPhone 17 Pro',
  })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional({
    description: 'Device platform',
    enum: ['ios', 'android', 'web', 'unknown'],
    example: 'ios',
  })
  @IsOptional()
  @IsString()
  @IsIn(['ios', 'android', 'web', 'unknown'])
  platform?: string;
}
