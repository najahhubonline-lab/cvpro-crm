import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('WhatsappController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/v1/whatsapp/webhook (GET) - should verify token', () => {
    const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'test-token';
    // Mocking the env variable if not set
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = verifyToken;

    return request(app.getHttpServer())
      .get(`/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=CHALLENGE_ACCEPTED`)
      .expect(200)
      .expect('CHALLENGE_ACCEPTED');
  });

  it('/api/v1/whatsapp/webhook (POST) - should reject invalid signature', () => {
    return request(app.getHttpServer())
      .post('/api/v1/whatsapp/webhook')
      .set('x-hub-signature-256', 'sha256=invalid_signature')
      .send({ object: 'whatsapp_business_account', entry: [] })
      .expect(401);
  });
});
