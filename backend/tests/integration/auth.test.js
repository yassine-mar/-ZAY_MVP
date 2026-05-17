'use strict';

/**
 * Integration tests for /auth endpoints.
 * Hits the real Express app and a real test database.
 *
 * NOTE: These tests will fail until services are implemented.
 * They serve as a specification of expected HTTP behavior.
 */

const request = require('supertest');
const { createApp } = require('../../src/app');
const { truncateAllTables, teardownTestDatabase } = require('./setup');

let app;

beforeAll(() => {
  ({ app } = createApp());
});

afterEach(async () => {
  await truncateAllTables();
});

afterAll(async () => {
  await teardownTestDatabase();
});

describe.skip('POST /api/v1/auth/register', () => {
  it('creates a customer account and returns a token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Fatima',
        email: 'fatima@test.com',
        phone: '+212612345678',
        password: 'TestPass123!',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('customer');
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.password_hash).toBeUndefined();
  });

  it('returns 400 on validation error', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toBeInstanceOf(Array);
  });

  it('returns 409 on duplicate email', async () => {
    const payload = {
      name: 'Fatima',
      email: 'duplicate@test.com',
      phone: '+212612345678',
      password: 'TestPass123!',
    };
    await request(app).post('/api/v1/auth/register').send(payload);
    const res = await request(app).post('/api/v1/auth/register').send(payload);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });
});

describe.skip('POST /api/v1/auth/login', () => {
  it('returns generic message on wrong password', async () => {
    // TODO: register user, then try wrong password
    // Expect: status 401, code INVALID_CREDENTIALS, message does not reveal which field is wrong
  });

  it('returns same generic message on non-existent email (prevents enumeration)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@test.com', password: 'Whatever123!' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});
