import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateMeDto {
  @ApiPropertyOptional({
    description:
      'New username (lowercase letters, numbers, underscore, dot). 3-30 chars.',
    example: 'newhandle',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  @IsString()
  @Matches(/^[a-z0-9_.]+$/, {
    message:
      'Username can only contain lowercase letters, numbers, underscore, and dot',
  })
  @MinLength(3)
  @MaxLength(30)
  username?: string;

  @ApiPropertyOptional({
    description: 'New display name',
    example: 'New Name',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  displayName?: string;

  @ApiPropertyOptional({
    description:
      'Avatar URL. Set to null to remove avatar. Omit to leave unchanged.',
    example: 'https://s3.eu-west-004.backblazeb2.com/bucket/avatars/abc.jpg',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((o) => o.avatarUrl !== null)
  @IsUrl(
    { require_protocol: true },
    { message: 'avatarUrl must be a valid URL or null' },
  )
  avatarUrl?: string | null;
}
