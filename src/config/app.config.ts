import { AuthConfig } from './auth.config';
import { GoogleAuthConfig } from './google.config';

export type NodeEnvironment = 'development' | 'test' | 'staging' | 'production';

export interface AppConfig {
  nodeEnv: NodeEnvironment;
  port: number;
  appName: string;
  apiKey?: string;
  internalServiceToken: string;
  enableInternalEndpoints: boolean;
  corsOrigin: string;
  swaggerEnabled: boolean;
  auth: AuthConfig;
  database: {
    url: string;
  };
  redis: {
    url: string;
  };
  stadiamaps: {
    apiKey: string;
    baseUrl: string;
  };
  google: GoogleAuthConfig;
}
