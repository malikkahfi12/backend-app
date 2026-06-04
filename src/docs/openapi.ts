import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupOpenApi(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Transit Backend API')
    .setDescription(
      'Public transit backend API foundation.\n\n' +
        'All successful responses are wrapped in an envelope:\n' +
        '```\n{\n  "success": true,\n  "data": ...,\n  "meta": {}\n}\n```\n\n' +
        'Error responses are NOT wrapped.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT access token obtained via /api/v1/auth/login',
      },
      'bearer',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'Internal service token',
        description: 'Internal service-to-service authentication token',
      },
      'internal-service-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
}
