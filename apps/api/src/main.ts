import 'reflect-metadata';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { config } from './config';

async function bootstrap() {
  mkdirSync(config.uploadDir, { recursive: true });

  // Body size is set below; the default parser is replaced so the limit applies.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  // Behind nginx: take the visitor's address from X-Forwarded-For (used to rate-limit forms).
  app.set('trust proxy', 'loopback, linklocal, uniquelocal');
  app.setGlobalPrefix('api');
  // The API only answers JSON and serves uploads, so the strictest headers fit; pages get theirs from the web app.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: { defaultSrc: ["'none'"], imgSrc: ["'self'"], mediaSrc: ["'self'"], fontSrc: ["'self'"], frameAncestors: ["'none'"] },
      },
      crossOriginResourcePolicy: { policy: 'same-origin' },
    }),
  );
  app.use(cookieParser());
  // Pages with many blocks can be large, but nothing legitimate comes near 2 MB of JSON. Uploads use multer.
  app.useBodyParser('json', { limit: '2mb' });
  app.useBodyParser('urlencoded', { limit: '100kb', extended: false });
  // Same-origin by default (the admin and site are served from the API's own domain). Set CORS_ORIGINS
  // (comma-separated) only for a separate front end; credentials are then allowed for those origins alone.
  if (config.corsOrigins.length) app.enableCors({ origin: config.corsOrigins, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  // nginx serves /uploads in Docker; this keeps local development working without it. Like nginx, it answers a
  // request for a WebP copy with the AVIF one when the browser accepts AVIF and that copy exists.
  app.use('/uploads', (req: Request, res: Response, next: NextFunction) => {
    const m = /^\/([\w-]+-\d+)\.webp$/.exec(req.path);
    if (m) {
      res.vary('Accept');
      if (/image\/avif/.test(req.headers.accept ?? '') && existsSync(join(config.uploadDir, `${m[1]}.avif`))) req.url = `/${m[1]}.avif`;
    }
    next();
  });
  app.useStaticAssets(config.uploadDir, { prefix: '/uploads', dotfiles: 'deny', index: false });
  app.enableShutdownHooks();

  await app.listen(config.port, '0.0.0.0');
}

bootstrap();
