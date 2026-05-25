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
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header',
      },
      'x-api-key',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'Internal service token',
      },
      'internal-service-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
}
