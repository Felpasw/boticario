import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module.js';

const packageJsonPath = resolve(dirname(fileURLToPath(import.meta.url)), '../package.json');
const packageVersion = (JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { version: string })
  .version;

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Boticario Wi-Fi Insights API')
    .setDescription('Guest Wi-Fi analytics for a Boticario store.')
    .setVersion(packageVersion)
    .addCookieAuth('boticario_session', { type: 'apiKey', in: 'cookie', name: 'boticario_session' })
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = Number(process.env.PORT ?? 3333);
  await app.listen(port);
}

await bootstrap();
