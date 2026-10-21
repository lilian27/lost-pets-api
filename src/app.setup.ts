import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { JSON_BODY_LIMIT } from './common/constants';

export function parseCorsOrigin(value?: string): string[] | boolean {
  return value ? value.split(',').map((o) => o.trim()) : true;
}

export function setupApp(app: NestExpressApplication): NestExpressApplication {
  app.useBodyParser('json', { limit: JSON_BODY_LIMIT });
  app.enableCors({ origin: parseCorsOrigin(process.env.CORS_ORIGIN) });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Lost Pets API')
    .setDescription(
      'Lost pets portal: auth, users, pets, publications, comments and notifications. Photos are base64 data URLs (max 2MB decoded).',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));
  return app;
}
