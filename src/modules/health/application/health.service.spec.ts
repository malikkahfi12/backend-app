import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../../config/app.config';
import { DatabaseHealthService } from '../../../infrastructure/database/database-health.service';
import { HealthService } from './health.service';

describe('HealthService', () => {
  const configService = {
    get: jest.fn((key: keyof AppConfig) => {
      const values: Pick<AppConfig, 'appName' | 'nodeEnv'> = {
        appName: 'Transit Backend',
        nodeEnv: 'development',
      };

      return values[key as keyof typeof values];
    }),
  } as unknown as ConfigService<AppConfig, true>;

  it('returns ok status when database is healthy', async () => {
    const databaseHealthService = {
      check: jest.fn().mockResolvedValue({
        status: 'ok',
        postgis: 'enabled',
      }),
    } as unknown as DatabaseHealthService;
    const service = new HealthService(configService, databaseHealthService);

    const result = await service.getStatus();

    expect(result.status).toBe('ok');
    expect(result.service).toBe('Transit Backend');
    expect(typeof result.timestamp).toBe('string');
    expect(result.environment).toBe('development');
    expect(result.dependencies.database).toEqual({
      status: 'ok',
      postgis: 'enabled',
    });
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });

  it('returns degraded status when database is down', async () => {
    const databaseHealthService = {
      check: jest.fn().mockResolvedValue({
        status: 'down',
        postgis: 'unknown',
      }),
    } as unknown as DatabaseHealthService;
    const service = new HealthService(configService, databaseHealthService);

    const result = await service.getStatus();

    expect(result.status).toBe('degraded');
    expect(result.dependencies.database).toEqual({
      status: 'down',
      postgis: 'unknown',
    });
  });
});
