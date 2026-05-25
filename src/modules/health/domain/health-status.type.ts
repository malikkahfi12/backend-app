import { DatabaseHealth } from '../../../infrastructure/database/types/database-health.type';

export type HealthStatus = {
  status: 'ok' | 'degraded';
  service: string;
  timestamp: string;
  environment: string;
  dependencies: {
    database: DatabaseHealth;
  };
};
