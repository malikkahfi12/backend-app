import { ConfigService } from '@nestjs/config';
import { DevTokenService } from './dev-token.service';
import { AppConfig } from '../../../config/app.config';

describe('DevTokenService', () => {
  const VALID_API_KEY = 'dev_tly_api_7f3b9c2a8e1d4f6a';
  const VALID_INTERNAL_TOKEN = 'dev_tly_internal_91d8c6e4b2a70f13';

  const createService = () => {
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'apiKey') return VALID_API_KEY;
        if (key === 'internalServiceToken') return VALID_INTERNAL_TOKEN;
        return undefined;
      }),
    } as unknown as ConfigService<AppConfig, true>;

    return new DevTokenService(configService);
  };

  describe('validateApiKey', () => {
    it('returns true for valid key', () => {
      const service = createService();
      expect(service.validateApiKey(VALID_API_KEY)).toBe(true);
    });

    it('returns false for invalid key', () => {
      const service = createService();
      expect(service.validateApiKey('wrong-key')).toBe(false);
    });

    it('returns false for empty value', () => {
      const service = createService();
      expect(service.validateApiKey('')).toBe(false);
    });
  });

  describe('validateInternalToken', () => {
    it('returns true for valid token', () => {
      const service = createService();
      expect(service.validateInternalToken(VALID_INTERNAL_TOKEN)).toBe(true);
    });

    it('returns false for invalid token', () => {
      const service = createService();
      expect(service.validateInternalToken('wrong-token')).toBe(false);
    });

    it('returns false for empty value', () => {
      const service = createService();
      expect(service.validateInternalToken('')).toBe(false);
    });
  });

  describe('maskToken', () => {
    it('masks middle of token', () => {
      const service = createService();
      const masked = service.maskToken(VALID_API_KEY);
      expect(masked).toBe('dev_***4f6a');
      expect(masked).not.toContain('7f3b9c2a8e1');
    });

    it('returns *** for short token', () => {
      const service = createService();
      expect(service.maskToken('1234')).toBe('***');
    });
  });
});
