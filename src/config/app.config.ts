import { AuthConfig } from './auth.config';
import { GoogleAuthConfig } from './google.config';

export type NodeEnvironment = 'development' | 'test' | 'staging' | 'production';

export interface StorageConfig {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
}

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
  logging: {
    level: string;
  };
  redis: {
    url: string;
  };
  stadiamaps: {
    apiKey: string;
    baseUrl: string;
  };
  storage: StorageConfig;
  google: GoogleAuthConfig;
}
