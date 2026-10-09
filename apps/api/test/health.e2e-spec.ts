import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import type { HealthResponse } from 'shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app.module.js';

describe('HealthController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /health returns 200 with db ok', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);

    const body = response.body as HealthResponse;
    expect(body).toMatchObject({
      status: 'ok',
      db: 'ok',
    });
    expect(body.timestamp).toEqual(expect.any(String));
  });
});
