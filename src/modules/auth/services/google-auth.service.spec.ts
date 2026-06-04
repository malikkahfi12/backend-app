import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { AppConfig } from '../../../config/app.config';
import { AuthException } from '../exceptions/auth.exception';
import { GoogleAuthService } from './google-auth.service';

const CLIENT_ID = 'test-client-id.apps.googleusercontent.com';

function createService(): GoogleAuthService {
  const configService = {
    get: jest.fn().mockReturnValue(CLIENT_ID),
  } as unknown as ConfigService<AppConfig, true>;

  return new GoogleAuthService(configService);
}

function createMockTicket(payload: Record<string, unknown>) {
  return {
    getPayload: jest.fn().mockReturnValue(payload),
  };
}

describe('GoogleAuthService', () => {
  describe('verifyIdToken', () => {
    it('returns normalized identity for a valid token', async () => {
      const service = createService();

      const mockPayload = {
        sub: 'google-user-123',
        email: 'user@example.com',
        email_verified: true,
        name: 'Test User',
        picture: 'https://example.com/photo.jpg',
      };

      const verifySpy = jest.spyOn(OAuth2Client.prototype, 'verifyIdToken');
      (verifySpy as jest.Mock).mockResolvedValue(createMockTicket(mockPayload));

      const result = await service.verifyIdToken('valid-id-token');

      expect(result).toEqual({
        sub: 'google-user-123',
        email: 'user@example.com',
        emailVerified: true,
        name: 'Test User',
        picture: 'https://example.com/photo.jpg',
      });

      verifySpy.mockRestore();
    });

    it('returns null for optional fields not present in payload', async () => {
      const service = createService();

      const mockPayload = {
        sub: 'google-user-456',
        email_verified: false,
      };

      const verifySpy = jest.spyOn(OAuth2Client.prototype, 'verifyIdToken');
      (verifySpy as jest.Mock).mockResolvedValue(createMockTicket(mockPayload));

      const result = await service.verifyIdToken('valid-id-token');

      expect(result).toEqual({
        sub: 'google-user-456',
        email: null,
        emailVerified: false,
        name: null,
        picture: null,
      });

      verifySpy.mockRestore();
    });

    it('throws GOOGLE_TOKEN_EXPIRED for expired token', async () => {
      const service = createService();

      const verifySpy = jest.spyOn(OAuth2Client.prototype, 'verifyIdToken');
      (verifySpy as jest.Mock).mockRejectedValue(
        new Error('Token used too late, 12345 > 12000'),
      );

      await expect(service.verifyIdToken('expired-token')).rejects.toThrow(
        AuthException,
      );

      try {
        await service.verifyIdToken('expired-token');
      } catch (error) {
        const authError = error as AuthException;
        expect(authError.code).toBe('GOOGLE_TOKEN_EXPIRED');
        expect(authError.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
      }

      verifySpy.mockRestore();
    });

    it('throws GOOGLE_TOKEN_AUDIENCE_MISMATCH for wrong audience', async () => {
      const service = createService();

      const verifySpy = jest.spyOn(OAuth2Client.prototype, 'verifyIdToken');
      (verifySpy as jest.Mock).mockRejectedValue(
        new Error(
          'Wrong audience: expected test-client-id but got wrong-client-id',
        ),
      );

      await expect(
        service.verifyIdToken('wrong-audience-token'),
      ).rejects.toThrow(AuthException);

      try {
        await service.verifyIdToken('wrong-audience-token');
      } catch (error) {
        const authError = error as AuthException;
        expect(authError.code).toBe('GOOGLE_TOKEN_AUDIENCE_MISMATCH');
        expect(authError.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
      }

      verifySpy.mockRestore();
    });

    it('throws GOOGLE_TOKEN_ISSUER_MISMATCH for wrong issuer', async () => {
      const service = createService();

      const verifySpy = jest.spyOn(OAuth2Client.prototype, 'verifyIdToken');
      (verifySpy as jest.Mock).mockRejectedValue(
        new Error(
          'Wrong issuer: expected accounts.google.com but got evil.com',
        ),
      );

      await expect(service.verifyIdToken('wrong-issuer-token')).rejects.toThrow(
        AuthException,
      );

      try {
        await service.verifyIdToken('wrong-issuer-token');
      } catch (error) {
        const authError = error as AuthException;
        expect(authError.code).toBe('GOOGLE_TOKEN_ISSUER_MISMATCH');
        expect(authError.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
      }

      verifySpy.mockRestore();
    });

    it('throws INVALID_GOOGLE_TOKEN for malformed token', async () => {
      const service = createService();

      const verifySpy = jest.spyOn(OAuth2Client.prototype, 'verifyIdToken');
      (verifySpy as jest.Mock).mockRejectedValue(
        new Error('Wrong number of segments in token'),
      );

      await expect(service.verifyIdToken('malformed-token')).rejects.toThrow(
        AuthException,
      );

      try {
        await service.verifyIdToken('malformed-token');
      } catch (error) {
        const authError = error as AuthException;
        expect(authError.code).toBe('INVALID_GOOGLE_TOKEN');
        expect(authError.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
      }

      verifySpy.mockRestore();
    });

    it('throws INVALID_GOOGLE_TOKEN for non-Error rejection', async () => {
      const service = createService();

      const verifySpy = jest.spyOn(OAuth2Client.prototype, 'verifyIdToken');
      (verifySpy as jest.Mock).mockRejectedValue('some string error');

      await expect(service.verifyIdToken('bad-token')).rejects.toThrow(
        AuthException,
      );

      try {
        await service.verifyIdToken('bad-token');
      } catch (error) {
        const authError = error as AuthException;
        expect(authError.code).toBe('INVALID_GOOGLE_TOKEN');
        expect(authError.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
      }

      verifySpy.mockRestore();
    });

    it('throws INVALID_GOOGLE_TOKEN when payload is null', async () => {
      const service = createService();

      const verifySpy = jest.spyOn(OAuth2Client.prototype, 'verifyIdToken');
      (verifySpy as jest.Mock).mockResolvedValue({
        getPayload: jest.fn().mockReturnValue(null),
      });

      await expect(
        service.verifyIdToken('empty-payload-token'),
      ).rejects.toThrow(AuthException);

      try {
        await service.verifyIdToken('empty-payload-token');
      } catch (error) {
        const authError = error as AuthException;
        expect(authError.code).toBe('INVALID_GOOGLE_TOKEN');
        expect(authError.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
      }

      verifySpy.mockRestore();
    });
  });
});
