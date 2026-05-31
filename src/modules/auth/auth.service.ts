import { HttpStatus, Injectable, OnModuleInit } from '@nestjs/common';
import _sodium from 'libsodium-wrappers';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ChallengeRequestDto } from './dto/challenge-request.dto';
import { ChallengeResponseDto } from './dto/challenge-response.dto';
import { DeviceListResponseDto } from './dto/device-response.dto';
import { LoginRequestDto } from './dto/login-request.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { RegisterDeviceResponseDto } from './dto/register-device-response.dto';
import { AuthException } from './exceptions/auth.exception';
import { TokenService } from './services/token.service';
import { CurrentUserPayload } from './types/current-user.type';

const CHALLENGE_BYTES = 32;
const CHALLENGE_TTL_MINUTES = 5;

const RESERVED_USERNAMES = new Set([
  'admin', 'root', 'system', 'support', 'patheo', 'api', 'auth',
  'moderator', 'mod', 'null', 'undefined', 'owner', 'staff',
]);

@Injectable()
export class AuthService implements OnModuleInit {
  private sodium!: typeof _sodium;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  async onModuleInit() {
    await _sodium.ready;
    this.sodium = _sodium;
  }

  async registerDevice(
    dto: RegisterDeviceDto,
  ): Promise<RegisterDeviceResponseDto> {
    const username = dto.username.toLowerCase().trim();
    const { displayName, publicKey } = dto;
    const deviceName = dto.deviceName ?? null;
    const platform = dto.platform ?? null;

    if (!this.isValidPublicKey(publicKey)) {
      throw new AuthException(
        'INVALID_PUBLIC_KEY',
        'Invalid public key',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (RESERVED_USERNAMES.has(username)) {
      throw new AuthException(
        'USERNAME_RESERVED',
        'This username is reserved',
        HttpStatus.CONFLICT,
      );
    }

    try {
      const result = await this.prismaService.$transaction(async (tx) => {
        const existing = await tx.user.findUnique({ where: { username } });
        if (existing) {
          throw new AuthException(
            'USERNAME_ALREADY_EXISTS',
            'Username already exists',
            HttpStatus.CONFLICT,
          );
        }

        const user = await tx.user.create({
          data: { username, displayName, isActive: true },
        });

        const device = await tx.userDevice.create({
          data: {
            userId: user.id,
            publicKey,
            deviceName,
            platform,
            lastSeenAt: new Date(),
          },
        });

        return { user, device };
      });

      const { accessToken, refreshToken, accessTokenExpiresIn } =
        await this.issueTokens(
          result.user.id,
          result.device.id,
          result.user.username,
        );

      return {
        data: {
          user: {
            id: result.user.id,
            username: result.user.username,
            displayName: result.user.displayName,
            avatarUrl: result.user.avatarUrl,
            avatarInitials: this.computeInitials(result.user.displayName),
            isActive: result.user.isActive,
            createdAt: result.user.createdAt.toISOString(),
          },
          device: {
            id: result.device.id,
            deviceName: result.device.deviceName,
            platform: result.device.platform,
            lastSeenAt: result.device.lastSeenAt?.toISOString() ?? null,
          },
          accessToken,
          refreshToken,
        },
        meta: { accessTokenExpiresIn },
      };
    } catch (error) {
      if (error instanceof AuthException) {
        throw error;
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new AuthException(
          'USERNAME_ALREADY_EXISTS',
          'Username already exists',
          HttpStatus.CONFLICT,
        );
      }
      throw error;
    }
  }

  async initiateChallenge(
    dto: ChallengeRequestDto,
  ): Promise<ChallengeResponseDto> {
    const username = dto.username.toLowerCase().trim();
    const { deviceId } = dto;

    const device = await this.prismaService.userDevice.findFirst({
      where: {
        id: deviceId,
        revokedAt: null,
        user: { username, isActive: true },
      },
    });

    if (!device) {
      throw new AuthException(
        'DEVICE_NOT_FOUND',
        'Device not found',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const challenge = randomBytes(CHALLENGE_BYTES).toString('base64url');
    const expiresAt = new Date(
      Date.now() + CHALLENGE_TTL_MINUTES * 60 * 1000,
    );

    const record = await this.prismaService.authChallenge.create({
      data: {
        userId: device.userId,
        deviceId: device.id,
        challenge,
        expiresAt,
      },
    });

    return {
      data: {
        challengeId: record.id,
        challenge,
        expiresAt: expiresAt.toISOString(),
      },
    };
  }

  async completeChallenge(
    dto: LoginRequestDto,
  ): Promise<LoginResponseDto> {
    const { challengeId, signature } = dto;

    const challengeRecord =
      await this.prismaService.authChallenge.findUnique({
        where: { id: challengeId },
      });

    if (!challengeRecord) {
      throw new AuthException(
        'INVALID_CHALLENGE',
        'Invalid challenge',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (challengeRecord.expiresAt < new Date()) {
      throw new AuthException(
        'CHALLENGE_EXPIRED',
        'Challenge has expired',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const consumed = await this.prismaService.authChallenge.updateMany({
      where: { id: challengeId, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    if (consumed.count === 0) {
      throw new AuthException(
        'CHALLENGE_ALREADY_CONSUMED',
        'Challenge has already been used',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const device = await this.prismaService.userDevice.findFirst({
      where: {
        id: challengeRecord.deviceId ?? undefined,
        revokedAt: null,
        user: { id: challengeRecord.userId ?? undefined, isActive: true },
      },
    });

    if (!device) {
      throw new AuthException(
        'USER_INACTIVE',
        'User account is inactive',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const signatureValid = this.verifyEd25519Signature(
      challengeRecord.challenge,
      signature,
      device.publicKey,
    );

    if (!signatureValid) {
      throw new AuthException(
        'INVALID_SIGNATURE',
        'Device signature verification failed',
        HttpStatus.UNAUTHORIZED,
      );
    }

    await this.prismaService.userDevice.update({
      where: { id: device.id },
      data: { lastSeenAt: new Date() },
    });

    const user = await this.prismaService.user.findUniqueOrThrow({
      where: { id: device.userId },
    });

    const { accessToken, refreshToken, accessTokenExpiresIn } =
      await this.issueTokens(user.id, device.id, user.username);

    return {
      data: {
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          avatarInitials: this.computeInitials(user.displayName),
          isActive: user.isActive,
          createdAt: user.createdAt.toISOString(),
        },
        device: {
          id: device.id,
          deviceName: device.deviceName,
          platform: device.platform,
          lastSeenAt: device.lastSeenAt?.toISOString() ?? null,
        },
        accessToken,
        refreshToken,
      },
      meta: { accessTokenExpiresIn },
    };
  }

  async refreshToken(
    rawToken: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresIn: number;
  }> {
    const tokenId = TokenService.parseTokenId(rawToken);
    if (!tokenId) {
      throw new AuthException(
        'INVALID_REFRESH_TOKEN',
        'Invalid refresh token',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const stored = await this.prismaService.refreshToken.findUnique({
      where: { id: tokenId },
      include: { user: true },
    });

    if (!stored || stored.revokedAt) {
      throw new AuthException(
        'INVALID_REFRESH_TOKEN',
        'Invalid refresh token',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (stored.expiresAt < new Date()) {
      throw new AuthException(
        'REFRESH_TOKEN_EXPIRED',
        'Refresh token has expired',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const valid = await this.tokenService.verifyTokenHash(
      rawToken,
      stored.tokenHash,
    );
    if (!valid) {
      throw new AuthException(
        'INVALID_REFRESH_TOKEN',
        'Invalid refresh token',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (!stored.user.isActive) {
      throw new AuthException(
        'USER_INACTIVE',
        'User account is inactive',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const [newRecord, accessToken] = await this.prismaService.$transaction(
      async (tx) => {
        await tx.refreshToken.update({
          where: { id: tokenId },
          data: { revokedAt: new Date() },
        });

        const record = await tx.refreshToken.create({
          data: {
            userId: stored.userId,
            deviceId: stored.deviceId,
            tokenHash: '',
            expiresAt: this.tokenService.getRefreshTokenExpiresAt(),
          },
        });

        const accessToken = await this.tokenService.signAccessToken(
          stored.userId,
          stored.deviceId ?? '',
          stored.user.username,
        );

        return [record, accessToken] as const;
      },
    );

    const { rawToken: newRawToken, tokenHash } =
      await this.tokenService.generateRefreshToken(newRecord.id);

    await this.prismaService.refreshToken.update({
      where: { id: newRecord.id },
      data: { tokenHash },
    });

    return {
      accessToken,
      refreshToken: newRawToken,
      accessTokenExpiresIn: this.tokenService.getAccessTokenExpirySeconds(),
    };
  }

  async logout(rawToken: string): Promise<{ message: string }> {
    const tokenId = TokenService.parseTokenId(rawToken);
    if (!tokenId) {
      return { message: 'Logged out successfully' };
    }

    const stored = await this.prismaService.refreshToken.findUnique({
      where: { id: tokenId },
    });

    if (!stored || stored.revokedAt) {
      return { message: 'Logged out successfully' };
    }

    await this.prismaService.refreshToken.update({
      where: { id: tokenId },
      data: { revokedAt: new Date() },
    });

    return { message: 'Logged out successfully' };
  }

  getCurrentUser(user: CurrentUserPayload): CurrentUserPayload {
    return user;
  }

  async listDevices(
    userId: string,
    currentDeviceId: string,
  ): Promise<DeviceListResponseDto> {
    const devices = await this.prismaService.userDevice.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    return {
      data: {
        devices: devices.map((d) => ({
          id: d.id,
          deviceName: d.deviceName,
          platform: d.platform,
          lastSeenAt: d.lastSeenAt?.toISOString() ?? null,
          createdAt: d.createdAt.toISOString(),
          isCurrent: d.id === currentDeviceId,
        })),
      },
    };
  }

  async revokeDevice(
    userId: string,
    deviceId: string,
    currentDeviceId: string,
  ): Promise<{ message: string }> {
    if (deviceId === currentDeviceId) {
      throw new AuthException(
        'CANNOT_REMOVE_CURRENT_DEVICE',
        'Current device cannot be removed',
        HttpStatus.FORBIDDEN,
      );
    }

    const device = await this.prismaService.userDevice.findFirst({
      where: { id: deviceId, userId },
    });

    if (!device) {
      throw new AuthException(
        'DEVICE_NOT_FOUND',
        'Device not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.prismaService.refreshToken.updateMany({
      where: {
        deviceId,
        revokedAt: null,
        expiresAt: { gte: new Date() },
      },
      data: { revokedAt: new Date() },
    });

    await this.prismaService.userDevice.update({
      where: { id: deviceId },
      data: { revokedAt: new Date() },
    });

    return { message: 'Device revoked successfully' };
  }

  async cleanupExpiredRecords(): Promise<{
    challenges: number;
    refreshTokens: number;
  }> {
    const challenges = await this.prismaService.authChallenge.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    const refreshTokens = await this.prismaService.refreshToken.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { not: null } }],
      },
    });

    return {
      challenges: challenges.count,
      refreshTokens: refreshTokens.count,
    };
  }

  private async issueTokens(
    userId: string,
    deviceId: string,
    username: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresIn: number;
  }> {
    const accessToken = await this.tokenService.signAccessToken(
      userId,
      deviceId,
      username,
    );

    const refreshRecord = await this.prismaService.refreshToken.create({
      data: {
        userId,
        deviceId,
        tokenHash: '',
        expiresAt: this.tokenService.getRefreshTokenExpiresAt(),
      },
    });

    const { rawToken, tokenHash } =
      await this.tokenService.generateRefreshToken(refreshRecord.id);

    await this.prismaService.refreshToken.update({
      where: { id: refreshRecord.id },
      data: { tokenHash },
    });

    return {
      accessToken,
      refreshToken: rawToken,
      accessTokenExpiresIn: this.tokenService.getAccessTokenExpirySeconds(),
    };
  }

  private verifyEd25519Signature(
    challenge: string,
    signatureBase64url: string,
    publicKeyBase64url: string,
  ): boolean {
    try {
      const message = Buffer.from(challenge, 'base64url');
      const signature = Buffer.from(signatureBase64url, 'base64url');
      const publicKey = Buffer.from(
        publicKeyBase64url.replace(/-/g, '+').replace(/_/g, '/'),
        'base64',
      );
      return this.sodium.crypto_sign_verify_detached(signature, message, publicKey);
    } catch {
      return false;
    }
  }

  private computeInitials(displayName: string): string {
    const words = displayName.trim().split(/\s+/);
    const initials = words
      .slice(0, 2)
      .map((w) => w.charAt(0))
      .join('');
    return initials.toUpperCase();
  }

  private isValidPublicKey(key: string): boolean {
    if (!key || typeof key !== 'string' || key.trim().length === 0) {
      return false;
    }
    if (!/^[A-Za-z0-9+/=_-]+$/.test(key)) {
      return false;
    }
    try {
      const raw = Buffer.from(
        key.replace(/-/g, '+').replace(/_/g, '/'),
        'base64',
      );
      return raw.length === this.sodium.crypto_sign_PUBLICKEYBYTES;
    } catch {
      return false;
    }
  }
}
