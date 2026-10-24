import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync } from 'node:fs';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { ENV, type Env } from './config/env';

async function bootstrap(): Promise<void> {
  // Local development reads apps/api/.env; real deployments set environment variables.
  if (existsSync('.env')) process.loadEnvFile('.env');

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const env = app.get<Env>(ENV);
  configureApp(app, env);
  await app.listen(env.PORT, '0.0.0.0');
  Logger.log(`Cherri API ready on http://localhost:${env.PORT}/api`, 'Bootstrap');
}

void bootstrap();
