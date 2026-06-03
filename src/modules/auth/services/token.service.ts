import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { AuthConfigService } from '../auth.config.service';
import { parseExpiryToSeconds } from '../../../common/utils/parse-expiry';

const TOKEN_BYTES = 64;

const ARGON2_OPTIONS: argon2.Options & { type: number } = {
  type: argon2.argon2id,
  timeCost: 2,
  memoryCost: 4096,
  parallelism: 2,
};

export interface GenerateRefreshTokenResult {
  rawToken: string;
  tokenHash: string;
  recordId: string;
}

export interface RecoveryTokenPayload {
  sub: string;
  purpose: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authConfigService: AuthConfigService,
  ) {}

  async signAccessToken(
    userId: string,
    deviceId: string,
    username: string,
  ): Promise<string> {
    return this.jwtService.signAsync({
      sub: userId,
      deviceId,
      username,
    });
  }

  async signRecoveryToken(
    userId: string,
    purpose: string,
  ): Promise<string> {
    return this.jwtService.signAsync(
      { sub: userId, purpose },
      { expiresIn: '10m' },
    );
  }

  async verifyRecoveryToken(
    token: string,
  ): Promise<RecoveryTokenPayload> {
    return this.jwtService.verifyAsync<RecoveryTokenPayload>(token);
  }

  async generateRefreshToken(
    recordId: string,
  ): Promise<GenerateRefreshTokenResult> {
    const random = randomBytes(TOKEN_BYTES).toString('base64url');
    const rawToken = `${Buffer.from(recordId).toString('base64url')}.${random}`;
    const tokenHash = await argon2.hash(rawToken, ARGON2_OPTIONS);
    return { rawToken, tokenHash, recordId };
  }

  async verifyTokenHash(token: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, token);
    } catch {
      return false;
    }
  }

  getAccessTokenExpirySeconds(): number {
    return parseExpiryToSeconds(this.authConfigService.getAccessTokenExpiry());
  }

  getRefreshTokenExpiresAt(): Date {
    const expiryStr = this.authConfigService.getRefreshTokenExpiry();
    const seconds = parseExpiryToSeconds(expiryStr);
    return new Date(Date.now() + seconds * 1000);
  }

  static parseTokenId(rawToken: string): string | null {
    const dotIndex = rawToken.indexOf('.');
    if (dotIndex === -1) return null;
    const encoded = rawToken.slice(0, dotIndex);
    if (!/^[A-Za-z0-9_-]+$/.test(encoded)) return null;
    try {
      return Buffer.from(encoded, 'base64url').toString('utf-8');
    } catch {
      return null;
    }
  }
}
