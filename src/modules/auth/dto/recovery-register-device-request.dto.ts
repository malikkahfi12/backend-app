import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class RecoveryRegisterDeviceRequestDto {
  @ApiProperty({
    description: 'Ed25519 public key encoded as base64url or base64',
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
