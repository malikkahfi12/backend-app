export type NodeEnvironment = 'development' | 'test' | 'staging' | 'production';

export interface AppConfig {
  nodeEnv: NodeEnvironment;
  port: number;
  appName: string;
  apiKey: string;
  internalServiceToken: string;
  enableInternalEndpoints: boolean;
  corsOrigin: string;
  swaggerEnabled: boolean;
  database: {
    url: string;
  };
  redis: {
    url: string;
  };
  overpass: {
    baseUrl: string;
    timeout: number;
  };
}
