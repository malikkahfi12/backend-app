import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../security/decorators/public.decorator';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { ChallengeRequestDto } from './dto/challenge-request.dto';
import { ChallengeResponseDto } from './dto/challenge-response.dto';
import { ConnectGoogleRequestDto } from './dto/connect-google-request.dto';
import { ConnectGoogleResponseDto } from './dto/connect-google-response.dto';
import { RecoveryGoogleRequestDto } from './dto/recovery-google-request.dto';
import { RecoveryGoogleResponseDto } from './dto/recovery-google-response.dto';
import { RecoveryRegisterDeviceRequestDto } from './dto/recovery-register-device-request.dto';
import { RecoveryRegisterDeviceResponseDto } from './dto/recovery-register-device-response.dto';
import {
  DeviceListResponseDto,
  DeviceRevokeResponseDto,
} from './dto/device-response.dto';
import { LoginRequestDto } from './dto/login-request.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { LogoutRequestDto } from './dto/logout-request.dto';
import { RefreshRequestDto } from './dto/refresh-request.dto';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { RegisterDeviceResponseDto } from './dto/register-device-response.dto';
import { TokenResponseDto } from './dto/token-response.dto';
import { AuthExceptionFilter } from './exceptions/auth-exception.filter';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { CurrentUserPayload } from './types/current-user.type';

const UNAUTHORIZED_EXAMPLE = {
  success: false,
  error: { code: 'UNAUTHORIZED', message: 'Authorization token is required' },
};

@ApiTags('Auth')
@Public()
@Controller('auth')
@UseFilters(AuthExceptionFilter)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiCreatedResponse({
    description: 'User and device registered with access and refresh tokens.',
    type: RegisterDeviceResponseDto,
  })
  @ApiConflictResponse({
    description: 'Username already exists.',
    schema: {
      example: {
        success: false,
        error: {
          code: 'USERNAME_ALREADY_EXISTS',
          message: 'Username already exists',
        },
      },
    },
  })
  async register(
    @Body() dto: RegisterDeviceDto,
  ): Promise<RegisterDeviceResponseDto> {
    return this.authService.registerDevice(dto);
  }

  @Post('challenge')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: 'Challenge generated for device authentication.',
    type: ChallengeResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Device not found or user inactive.',
    schema: {
      example: {
        success: false,
        error: { code: 'DEVICE_NOT_FOUND', message: 'Device not found' },
      },
    },
  })
  async challenge(
    @Body() dto: ChallengeRequestDto,
  ): Promise<ChallengeResponseDto> {
    return this.authService.initiateChallenge(dto);
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: 'Challenge verified, tokens issued.',
    type: LoginResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid challenge, expired, or invalid signature.',
    schema: {
      example: {
        success: false,
        error: { code: 'INVALID_CHALLENGE', message: 'Invalid challenge' },
      },
    },
  })
  async login(@Body() dto: LoginRequestDto): Promise<LoginResponseDto> {
    return this.authService.completeChallenge(dto);
  }

  @Post('refresh')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: 'Tokens rotated successfully.',
    type: TokenResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired refresh token.',
    schema: {
      example: {
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid refresh token',
        },
      },
    },
  })
  async refresh(@Body() dto: RefreshRequestDto): Promise<TokenResponseDto> {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: 'Refresh token revoked successfully.',
    schema: {
      example: {
        success: true,
        data: { message: 'Logged out successfully' },
      },
    },
  })
  async logout(@Body() dto: LogoutRequestDto): Promise<{ message: string }> {
    return this.authService.logout(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'Current authenticated user.',
    schema: {
      example: {
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          username: 'malik',
          displayName: 'Malik',
          avatarUrl: null,
          avatarInitials: 'M',
          isActive: true,
          deviceId: '660e8400-e29b-41d4-a716-446655440001',
          createdAt: '2025-05-29T12:00:00.000Z',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid access token.',
    schema: { example: UNAUTHORIZED_EXAMPLE },
  })
  async getMe(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<{ data: CurrentUserPayload }> {
    return { data: this.authService.getCurrentUser(user) };
  }

  @Get('devices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'List of user devices.',
    type: DeviceListResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid access token.',
    schema: { example: UNAUTHORIZED_EXAMPLE },
  })
  async getDevices(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<DeviceListResponseDto> {
    return this.authService.listDevices(user.id, user.deviceId);
  }

  @Delete('devices/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'Device revoked successfully.',
    type: DeviceRevokeResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid access token.',
    schema: { example: UNAUTHORIZED_EXAMPLE },
  })
  @ApiForbiddenResponse({
    description: 'Cannot remove the current device.',
    schema: {
      example: {
        success: false,
        error: {
          code: 'CANNOT_REMOVE_CURRENT_DEVICE',
          message: 'Current device cannot be removed',
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Device not found.',
    schema: {
      example: {
        success: false,
        error: { code: 'DEVICE_NOT_FOUND', message: 'Device not found' },
      },
    },
  })
  async revokeDevice(
    @Param('id') deviceId: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<{ data: { message: string } }> {
    return {
      data: await this.authService.revokeDevice(
        user.id,
        deviceId,
        user.deviceId,
      ),
    };
  }

  @Post('identities/google/connect')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'Google account linked successfully.',
    type: ConnectGoogleResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid access token.',
    schema: { example: UNAUTHORIZED_EXAMPLE },
  })
  @ApiForbiddenResponse({
    description: 'Google account email is not verified.',
    schema: {
      example: {
        success: false,
        error: {
          code: 'GOOGLE_EMAIL_NOT_VERIFIED',
          message: 'Google account email is not verified',
        },
      },
    },
  })
  @ApiConflictResponse({
    description: 'Google account already linked to another user.',
    schema: {
      example: {
        success: false,
        error: {
          code: 'GOOGLE_ACCOUNT_ALREADY_LINKED',
          message: 'This Google account is already linked to another user',
        },
      },
    },
  })
  async connectGoogle(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ConnectGoogleRequestDto,
  ): Promise<ConnectGoogleResponseDto> {
    return this.authService.connectGoogleAccount(user.id, dto.idToken);
  }

  @Post('recovery/google')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: 'Recovery token issued successfully.',
    type: RecoveryGoogleResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid Google token or user account inactive.',
    schema: {
      example: {
        success: false,
        error: {
          code: 'INVALID_GOOGLE_TOKEN',
          message: 'Failed to verify Google ID token',
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Google account email is not verified.',
    schema: {
      example: {
        success: false,
        error: {
          code: 'GOOGLE_EMAIL_NOT_VERIFIED',
          message: 'Google account email is not verified',
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'No account linked to this Google identity.',
    schema: {
      example: {
        success: false,
        error: {
          code: 'GOOGLE_ACCOUNT_NOT_LINKED',
          message: 'No account linked to this Google identity',
        },
      },
    },
  })
  async recoverWithGoogle(
    @Body() dto: RecoveryGoogleRequestDto,
  ): Promise<RecoveryGoogleResponseDto> {
    return this.authService.recoverWithGoogle(dto.idToken);
  }

  @Post('recovery/register-device')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: 'New device registered and challenge issued.',
    type: RecoveryRegisterDeviceResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid public key.',
    schema: {
      example: {
        success: false,
        error: {
          code: 'INVALID_PUBLIC_KEY',
          message: 'Invalid public key',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired recovery token, or user inactive.',
    schema: {
      example: {
        success: false,
        error: {
          code: 'INVALID_RECOVERY_TOKEN',
          message: 'Invalid or expired recovery token',
        },
      },
    },
  })
  async registerDeviceAfterRecovery(
    @Headers('authorization') authHeader: string,
    @Body() dto: RecoveryRegisterDeviceRequestDto,
  ): Promise<RecoveryRegisterDeviceResponseDto> {
    return this.authService.registerDeviceAfterRecovery(authHeader, {
      publicKey: dto.publicKey,
      deviceName: dto.deviceName ?? null,
      platform: dto.platform ?? null,
    });
  }
}
