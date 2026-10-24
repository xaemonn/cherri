import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { PRIVATE_NETWORK_ORIGIN } from './common/network';
import type { Env } from './config/env';

/** HTTP hardening shared by the real server and the e2e test app. */
export function configureApp(app: NestExpressApplication, env: Env): void {
  if (env.TRUST_PROXY) app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet());
  app.enableCors({
    // In dev, also accept the web app opened from a phone on the same Wi-Fi (e.g. a scanned share QR).
    origin: env.NODE_ENV === 'development' ? [...env.CORS_ORIGINS, PRIVATE_NETWORK_ORIGIN] : env.CORS_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86_400,
  });
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
}
