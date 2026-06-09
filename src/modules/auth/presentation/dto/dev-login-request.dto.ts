import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class DevLoginRequestDto {
  @ApiProperty({
    description: 'Username untuk dev account',
    example: 'dev',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(30)
  username!: string;

  @ApiPropertyOptional({
    description: 'Display name (default ke username)',
    example: 'Developer',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;
}
