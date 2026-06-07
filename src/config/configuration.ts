import { AppConfig, NodeEnvironment } from './app.config';

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV as NodeEnvironment,
  port: Number(process.env.PORT),
  appName: process.env.APP_NAME as string,
  apiKey: process.env.API_KEY,
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
  logging: {
    level: process.env.LOG_LEVEL ?? 'info',
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
  storage: {
    endpoint: process.env.STORAGE_ENDPOINT as string,
    region: process.env.STORAGE_REGION as string,
    accessKeyId: process.env.STORAGE_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY as string,
    bucketName: process.env.STORAGE_BUCKET_NAME as string,
    publicUrl: process.env.STORAGE_PUBLIC_URL as string,
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID as string,
  },
});
