import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { AppConfig } from '../../../config/app.config';
import { AuthException } from '../exceptions/auth.exception';
import type { GoogleIdentity } from '../types/google-identity.type';

@Injectable()
export class GoogleAuthService {
  private readonly clientId: string;
  private readonly client: OAuth2Client;

  constructor(configService: ConfigService<AppConfig, true>) {
    this.clientId = configService.get('google.clientId', { infer: true });
    this.client = new OAuth2Client(this.clientId);
  }

  async verifyIdToken(idToken: string): Promise<GoogleIdentity> {
    let ticket;
    try {
      ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.clientId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      if (/expired|too late/i.test(message)) {
        throw new AuthException(
          'GOOGLE_TOKEN_EXPIRED',
          'Google ID token has expired',
          HttpStatus.UNAUTHORIZED,
        );
      }

      if (/audience/i.test(message)) {
        throw new AuthException(
          'GOOGLE_TOKEN_AUDIENCE_MISMATCH',
          'Google ID token audience does not match the expected client ID',
          HttpStatus.UNAUTHORIZED,
        );
      }

      if (/issuer/i.test(message)) {
        throw new AuthException(
          'GOOGLE_TOKEN_ISSUER_MISMATCH',
          'Google ID token issuer is invalid',
          HttpStatus.UNAUTHORIZED,
        );
      }

      throw new AuthException(
        'INVALID_GOOGLE_TOKEN',
        'Failed to verify Google ID token',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const payload = ticket.getPayload();
    if (!payload) {
      throw new AuthException(
        'INVALID_GOOGLE_TOKEN',
        'Google ID token payload is empty',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return {
      sub: payload.sub,
      email: payload.email ?? null,
      emailVerified: payload.email_verified === true,
      name: payload.name ?? null,
      picture: payload.picture ?? null,
    };
  }
}
