import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { setupOpenApi } from './docs/openapi';
import { setupApp } from './app.setup';
import { AppConfig } from './config/app.config';
import { normalizeRepeatedSlashes } from './common/middleware/path-normalize.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService<AppConfig, true>);
  const port = configService.get('port', { infer: true });
  const corsOrigin = configService.get('corsOrigin', { infer: true });
  const swaggerEnabled = configService.get('swaggerEnabled', { infer: true });
  const nodeEnv = configService.get('nodeEnv', { infer: true });

  app.use(normalizeRepeatedSlashes);
  app.use(helmet());
  app.use(compression());
  app.enableCors({
    origin: corsOrigin,
  });
  app.enableShutdownHooks();
  setupApp(app);

  const swaggerAllowed = ['development', 'test'].includes(nodeEnv);

  if (swaggerEnabled && swaggerAllowed) {
    setupOpenApi(app);
  }

  await app.listen(port);
}
void bootstrap();
