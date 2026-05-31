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
  auth: {
    accessSecret: process.env.JWT_ACCESS_SECRET as string,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET as string,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
  },
  database: {
    url: process.env.DATABASE_URL as string,
  },
  redis: {
    url: process.env.REDIS_URL as string,
  },
  stadiamaps: {
    apiKey: process.env.STADIAMAPS_API_KEY as string,
    baseUrl: process.env.STADIAMAPS_BASE_URL ?? 'https://api.stadiamaps.com',
  },
});
