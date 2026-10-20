import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';

export const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
export const BIG_PNG =
  'data:image/png;base64,' +
  Buffer.alloc(2 * 1024 * 1024 + 1).toString('base64');

export interface TestCtx {
  app: NestExpressApplication;
  mongo?: MongoMemoryServer;
  http: () => ReturnType<typeof request>;
}

export async function createTestApp(): Promise<TestCtx> {
  let mongo: MongoMemoryServer | undefined;
  if (process.env.MONGODB_URI_TEST) {
    process.env.MONGODB_URI = process.env.MONGODB_URI_TEST;
  } else {
    mongo = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongo.getUri('lost-pets-test');
  }
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({
    bodyParser: false,
  });
  setupApp(app);
  await app.init();
  await app.get<Connection>(getConnectionToken()).syncIndexes();
  return { app, mongo, http: () => request(app.getHttpServer()) };
}

export async function closeTestApp(ctx: TestCtx) {
  await ctx.app.get<Connection>(getConnectionToken()).dropDatabase();
  await ctx.app.close();
  await ctx.mongo?.stop();
}

let seq = 0;
export function newUser(overrides: Record<string, string> = {}) {
  seq += 1;
  const id = `${Date.now().toString(36)}${seq}`;
  return {
    alias: `user_${id}`,
    name: `Real Name ${id}`,
    email: `user_${id}@example.com`,
    phone: '+56 9 1234 5678',
    commune: 'Providencia',
    password: 'secret123',
    ...overrides,
  };
}

export const petPayload = (overrides: Record<string, unknown> = {}) => ({
  name: 'Luna',
  species: 'dog',
  sex: 'male',
  size: 'medium',
  color: 'brown',
  vaccines: 'Rabies 2025',
  photo: PNG,
  ...overrides,
});
