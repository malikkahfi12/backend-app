import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import pino from 'pino';
import helmet from 'helmet';
import compression from 'compression';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { setupOpenApi } from './docs/openapi';
import { setupApp } from './app.setup';
import { AppConfig } from './config/app.config';
import { normalizeRepeatedSlashes } from './common/middleware/path-normalize.middleware';

const rawLogger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  ...(process.env.NODE_ENV === 'development'
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, singleLine: true },
        },
      }
    : {}),
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  const configService = app.get(ConfigService<AppConfig, true>);
  const port = configService.get('port', { infer: true });
  const corsOrigin = configService.get('corsOrigin', { infer: true });
  const swaggerEnabled = configService.get('swaggerEnabled', { infer: true });
  const nodeEnv = configService.get('nodeEnv', { infer: true });

  app.use(normalizeRepeatedSlashes);

  app.use((req: Request, res: Response, next: NextFunction) => {
    const ct = req.headers['content-type'] ?? '';
    if (
      req.method === 'POST' &&
      ct.startsWith('multipart/form-data') &&
      !ct.includes('boundary=')
    ) {
      rawLogger.warn(
        { method: req.method, url: req.url, contentType: ct },
        'Multipart request missing boundary',
      );
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILE',
          message: 'Invalid upload request: missing multipart boundary',
        },
      });
      return;
    }
    next();
  });

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

  app.use(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (err: unknown, req: Request, res: Response, _next: NextFunction) => {
      rawLogger.error(
        {
          err,
          method: req.method,
          url: req.url,
          headers: {
            contentType: req.headers['content-type'],
            contentLength: req.headers['content-length'],
          },
        },
        'Express-level error before NestJS pipeline',
      );
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Request processing failed' },
      });
    },
  );

  await app.listen(port);
}
void bootstrap();
