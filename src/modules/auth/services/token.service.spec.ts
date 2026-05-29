import { JwtService } from '@nestjs/jwt';
import { AuthConfigService } from '../auth.config.service';
import { TokenService } from './token.service';

const ACCESS_SECRET = 'test-access-secret';
const ACCESS_EXPIRY = '15m';

function createService(): TokenService {
  const jwtService = {
    signAsync: jest.fn().mockResolvedValue('signed-jwt-token'),
  } as unknown as JwtService;

  const authConfigService = {
    getAccessTokenSecret: jest.fn().mockReturnValue(ACCESS_SECRET),
    getAccessTokenExpiry: jest.fn().mockReturnValue(ACCESS_EXPIRY),
    getRefreshTokenSecret: jest.fn().mockReturnValue('refresh-secret'),
    getRefreshTokenExpiry: jest.fn().mockReturnValue('90d'),
  } as unknown as AuthConfigService;

  return new TokenService(jwtService, authConfigService);
}

describe('TokenService', () => {
  describe('signAccessToken', () => {
    it('signs a JWT with user payload', async () => {
      const service = createService();
      const token = await service.signAccessToken(
        'user-1',
        'device-1',
        'malik',
      );

      expect(token).toBe('signed-jwt-token');
    });
  });

  describe('generateRefreshToken', () => {
    it('generates a structured refresh token', async () => {
      const service = createService();
      const result = await service.generateRefreshToken('test-record-id');

      expect(result.rawToken).toContain('.');
      expect(result.rawToken.length).toBeGreaterThan(40);
      expect(result.tokenHash).toBeTruthy();
      expect(result.tokenHash).toContain('$argon2id$');
    });

    it('embeds the record ID in the token', async () => {
      const service = createService();
      const recordId = 'test-record-id';
      const result = await service.generateRefreshToken(recordId);

      const tokenId = TokenService.parseTokenId(result.rawToken);
      expect(tokenId).toBe(recordId);
    });

    it('generates unique tokens each call', async () => {
      const service = createService();
      const result1 = await service.generateRefreshToken('id-1');
      const result2 = await service.generateRefreshToken('id-1');

      expect(result1.rawToken).not.toBe(result2.rawToken);
      expect(result1.tokenHash).not.toBe(result2.tokenHash);
    });
  });

  describe('verifyTokenHash', () => {
    it('verifies a valid token hash', async () => {
      const service = createService();
      const { rawToken, tokenHash } =
        await service.generateRefreshToken('test-id');
      const valid = await service.verifyTokenHash(rawToken, tokenHash);
      expect(valid).toBe(true);
    });

    it('rejects an invalid token', async () => {
      const service = createService();
      const { tokenHash } = await service.generateRefreshToken('test-id');
      const valid = await service.verifyTokenHash(
        'wrong.token.value',
        tokenHash,
      );
      expect(valid).toBe(false);
    });
  });

  describe('getAccessTokenExpirySeconds', () => {
    it('returns 900 seconds for 15m', () => {
      const service = createService();
      expect(service.getAccessTokenExpirySeconds()).toBe(900);
    });
  });

  describe('getRefreshTokenExpiresAt', () => {
    it('returns a future Date for 90d', () => {
      const service = createService();
      const expiresAt = service.getRefreshTokenExpiresAt();
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('parseTokenId', () => {
    it('extracts the record ID from a valid token', () => {
      const id = TokenService.parseTokenId(
        'ZHVtbXktcmVjb3JkLWlk.tzLSEBOobp0',
      );
      expect(id).toBe('dummy-record-id');
    });

    it('returns null for a token without separator', () => {
      const id = TokenService.parseTokenId('no-dot-here');
      expect(id).toBeNull();
    });

    it('returns null for invalid base64url in prefix', () => {
      const id = TokenService.parseTokenId('!!!@invalid.secret');
      expect(id).toBeNull();
    });
  });
});
