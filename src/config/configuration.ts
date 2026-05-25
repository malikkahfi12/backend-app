import { AppConfig, NodeEnvironment } from './app.config';

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV as NodeEnvironment,
  port: Number(process.env.PORT),
  appName: process.env.APP_NAME as string,
  apiKey: process.env.API_KEY as string,
  internalServiceToken: process.env.INTERNAL_SERVICE_TOKEN as string,
  enableInternalEndpoints: process.env.ENABLE_INTERNAL_ENDPOINTS === 'true',
  corsOrigin: process.env.CORS_ORIGIN as string,
  swaggerEnabled: process.env.SWAGGER_ENABLED === 'true',
  database: {
    url: process.env.DATABASE_URL as string,
  },
  redis: {
    url: process.env.REDIS_URL as string,
  },
  overpass: {
    baseUrl: (process.env.OVERPASS_BASE_URL ??
      'https://overpass-api.de/api/interpreter') as string,
    timeout: Number(process.env.OVERPASS_TIMEOUT ?? 30000),
  },
});
