import { plainToInstance, Transform } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
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
  @IsNotEmpty()
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
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  REDIS_URL!: string;

  @IsString()
  @IsNotEmpty()
  OVERPASS_BASE_URL!: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1000)
  OVERPASS_TIMEOUT!: number;

  @IsString()
  @IsNotEmpty()
  MAPTILER_API_KEY!: string;

  @IsString()
  @IsNotEmpty()
  MAPTILER_GEOCODING_BASE_URL!: string;
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

  return validatedConfig;
}
