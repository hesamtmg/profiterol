import 'reflect-metadata';
import { mkdirSync } from 'node:fs';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { config } from './config';

async function bootstrap() {
  mkdirSync(config.uploadDir, { recursive: true });

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Behind nginx: take the visitor's address from X-Forwarded-For (used to rate-limit forms).
  app.set('trust proxy', 'loopback, linklocal, uniquelocal');
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  // nginx serves /uploads in Docker; this keeps local development working without it.
  app.useStaticAssets(config.uploadDir, { prefix: '/uploads', dotfiles: 'deny', index: false });
  app.enableShutdownHooks();

  await app.listen(config.port, '0.0.0.0');
}

bootstrap();
