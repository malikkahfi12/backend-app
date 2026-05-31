import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/app.config';
import { AuthConfigService } from './auth.config.service';

const mockAuthConfig = {
  accessSecret: 'test-access-secret-32chars-long-enough!!',
  accessExpiresIn: '15m',
  refreshSecret: 'test-refresh-secret-32chars-long-enough',
  refreshExpiresIn: '30d',
};

function createService(): AuthConfigService {
  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'auth.accessSecret') return mockAuthConfig.accessSecret;
      if (key === 'auth.accessExpiresIn') return mockAuthConfig.accessExpiresIn;
      if (key === 'auth.refreshSecret') return mockAuthConfig.refreshSecret;
      if (key === 'auth.refreshExpiresIn')
        return mockAuthConfig.refreshExpiresIn;
      return undefined;
    }),
  } as unknown as ConfigService<AppConfig, true>;

  return new AuthConfigService(configService);
}

describe('AuthConfigService', () => {
  it('returns access token secret', () => {
    const service = createService();
    expect(service.getAccessTokenSecret()).toBe(mockAuthConfig.accessSecret);
  });

  it('returns access token expiry', () => {
    const service = createService();
    expect(service.getAccessTokenExpiry()).toBe(mockAuthConfig.accessExpiresIn);
  });

  it('returns refresh token secret', () => {
    const service = createService();
    expect(service.getRefreshTokenSecret()).toBe(mockAuthConfig.refreshSecret);
  });

  it('returns refresh token expiry', () => {
    const service = createService();
    expect(service.getRefreshTokenExpiry()).toBe(
      mockAuthConfig.refreshExpiresIn,
    );
  });
});
