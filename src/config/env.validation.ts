import { plainToInstance, Transform } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';
import type { NodeEnvironment } from './app.config';

const environments: NodeEnvironment[] = [
  'development',
  'test',
  'staging',
  'production',
];

const MIN_SECRET_LENGTH = 24;
const MIN_JWT_SECRET_LENGTH_DEV = 16;
const MIN_JWT_SECRET_LENGTH_PROD = 32;
const JWT_EXPIRY_REGEX = /^\d+[smhd]$/;

class EnvironmentVariables {
  @IsEnum(environments)
  NODE_ENV!: NodeEnvironment;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  PORT!: number;

  @IsString()
  @IsNotEmpty()
  APP_NAME!: string;

  @IsString()
  @IsOptional()
  API_KEY!: string;

  @IsString()
  @IsNotEmpty()
  INTERNAL_SERVICE_TOKEN!: string;

  @IsIn(['true', 'false'])
  ENABLE_INTERNAL_ENDPOINTS!: string;

  @IsString()
  @IsNotEmpty()
  CORS_ORIGIN!: string;

  @IsIn(['true', 'false'])
  SWAGGER_ENABLED!: string;

  @IsString()
  @MinLength(MIN_JWT_SECRET_LENGTH_DEV)
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @Matches(JWT_EXPIRY_REGEX)
  JWT_ACCESS_EXPIRES_IN!: string;

  @IsString()
  @MinLength(MIN_JWT_SECRET_LENGTH_DEV)
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @Matches(JWT_EXPIRY_REGEX)
  JWT_REFRESH_EXPIRES_IN!: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  REDIS_URL!: string;

  @IsString()
  @IsNotEmpty()
  STADIAMAPS_API_KEY!: string;

  @IsString()
  @IsNotEmpty()
  STADIAMAPS_BASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  STORAGE_ENDPOINT!: string;

  @IsString()
  @IsNotEmpty()
  STORAGE_REGION!: string;

  @IsString()
  @IsNotEmpty()
  STORAGE_APPLICATION_KEY_ID!: string;

  @IsString()
  @IsNotEmpty()
  STORAGE_APPLICATION_KEY!: string;

  @IsString()
  @IsNotEmpty()
  STORAGE_BUCKET_NAME!: string;

  @IsString()
  @IsNotEmpty()
  GOOGLE_CLIENT_ID!: string;
}

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: false,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  const env = validatedConfig.NODE_ENV;

  if (
    validatedConfig.API_KEY &&
    (env === 'development' || env === 'staging') &&
    validatedConfig.API_KEY.length < MIN_SECRET_LENGTH
  ) {
    throw new Error(
      `API_KEY must be at least ${MIN_SECRET_LENGTH} characters in ${env} environment`,
    );
  }

  if (validatedConfig.ENABLE_INTERNAL_ENDPOINTS === 'true') {
    if (
      !validatedConfig.INTERNAL_SERVICE_TOKEN ||
      validatedConfig.INTERNAL_SERVICE_TOKEN.length < MIN_SECRET_LENGTH
    ) {
      throw new Error(
        `INTERNAL_SERVICE_TOKEN must be at least ${MIN_SECRET_LENGTH} characters when ENABLE_INTERNAL_ENDPOINTS is true`,
      );
    }
  }

  if (
    env === 'production' &&
    validatedConfig.JWT_ACCESS_SECRET.length < MIN_JWT_SECRET_LENGTH_PROD
  ) {
    throw new Error(
      `JWT_ACCESS_SECRET must be at least ${MIN_JWT_SECRET_LENGTH_PROD} characters in production`,
    );
  }

  if (
    env === 'production' &&
    validatedConfig.JWT_REFRESH_SECRET.length < MIN_JWT_SECRET_LENGTH_PROD
  ) {
    throw new Error(
      `JWT_REFRESH_SECRET must be at least ${MIN_JWT_SECRET_LENGTH_PROD} characters in production`,
    );
  }

  return validatedConfig;
}
