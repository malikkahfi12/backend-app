import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../../config/app.config';
import { DatabaseHealthService } from '../../../infrastructure/database/database-health.service';
import { HealthStatus } from '../domain/health-status.type';

@Injectable()
export class HealthService {
  constructor(
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly databaseHealthService: DatabaseHealthService,
  ) {}

  async getStatus(): Promise<HealthStatus> {
    const database = await this.databaseHealthService.check();

    return {
      status: database.status === 'ok' ? 'ok' : 'degraded',
      service: this.configService.get('appName', { infer: true }),
      timestamp: new Date().toISOString(),
      environment: this.configService.get('nodeEnv', { infer: true }),
      dependencies: {
        database,
      },
    };
  }
}
