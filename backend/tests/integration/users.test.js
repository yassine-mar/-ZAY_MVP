'use strict';

const request = require('supertest');
const { createApp } = require('../../src/app');
const { db, closeDatabase } = require('../../src/config/database');
const { truncateAuthTables, createTestUser } = require('../helpers/auth.helpers');

let app;

beforeAll(() => {
  ({ app } = createApp());
});

afterEach(async () => {
  await truncateAuthTables();
});

afterAll(async () => {
  await closeDatabase();
});

const loginAs = async (user) => {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: user.email, password: user._password });
  return res.body.data;
};

describe('GET /api/v1/users/me', () => {
  it('returns own profile when authenticated', async () => {
    const user = await createTestUser();
    const { access_token } = await loginAs(user);

    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${access_token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe(user.id);
    expect(res.body.data.user.password_hash).toBeUndefined();
    expect(res.body.data.user.fcm_token).toBeUndefined();
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/users/me');
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/v1/users/me', () => {
  it('updates name and phone', async () => {
    const user = await createTestUser();
    const { access_token } = await loginAs(user);

    const res = await request(app)
      .put('/api/v1/users/me')
      .set('Authorization', `Bearer ${access_token}`)
      .send({ name: 'Updated Name', phone: '+212611112222' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe('Updated Name');
    expect(res.body.data.user.phone).toBe('+212611112222');
  });

  it('ignores attempts to change role, email, or status', async () => {
    const user = await createTestUser();
    const { access_token } = await loginAs(user);

    const res = await request(app)
      .put('/api/v1/users/me')
      .set('Authorization', `Bearer ${access_token}`)
      .send({
        name: 'New Name',
        role: 'admin',
        email: 'hacker@x.com',
        status: 'suspended',
        password: 'NewPass1!',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('customer');
    expect(res.body.data.user.email).toBe(user.email);
    expect(res.body.data.user.status).toBe('active');
  });

  it('rejects empty update body', async () => {
    const user = await createTestUser();
    const { access_token } = await loginAs(user);

    const res = await request(app)
      .put('/api/v1/users/me')
      .set('Authorization', `Bearer ${access_token}`)
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/users/me/password', () => {
  it('changes password with valid current password', async () => {
    const user = await createTestUser({ password: 'CurrentPass1!' });
    const { access_token, refresh_token } = await loginAs(user);

    const res = await request(app)
      .post('/api/v1/users/me/password')
      .set('Authorization', `Bearer ${access_token}`)
      .send({
        current_password: 'CurrentPass1!',
        new_password: 'NewStrongPass2@',
      });

    expect(res.status).toBe(200);

    // Old refresh token should now be revoked (defense — force re-login everywhere)
    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refresh_token });
    expect(refreshRes.status).toBe(401);

    // Old password no longer works
    const loginOld = await request(app).post('/api/v1/auth/login').send({
      email: user.email,
      password: 'CurrentPass1!',
    });
    expect(loginOld.status).toBe(401);

    // New password works
    const loginNew = await request(app).post('/api/v1/auth/login').send({
      email: user.email,
      password: 'NewStrongPass2@',
    });
    expect(loginNew.status).toBe(200);
  });

  it('rejects with 401 when current password is wrong', async () => {
    const user = await createTestUser({ password: 'CurrentPass1!' });
    const { access_token } = await loginAs(user);

    const res = await request(app)
      .post('/api/v1/users/me/password')
      .set('Authorization', `Bearer ${access_token}`)
      .send({
        current_password: 'WrongPass1!',
        new_password: 'NewStrongPass2@',
      });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CURRENT_PASSWORD');
  });

  it('rejects with 400 when new password equals current', async () => {
    const user = await createTestUser({ password: 'CurrentPass1!' });
    const { access_token } = await loginAs(user);

    const res = await request(app)
      .post('/api/v1/users/me/password')
      .set('Authorization', `Bearer ${access_token}`)
      .send({
        current_password: 'CurrentPass1!',
        new_password: 'CurrentPass1!',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('SAME_PASSWORD');
  });

  it('rejects weak new password', async () => {
    const user = await createTestUser({ password: 'CurrentPass1!' });
    const { access_token } = await loginAs(user);

    const res = await request(app)
      .post('/api/v1/users/me/password')
      .set('Authorization', `Bearer ${access_token}`)
      .send({ current_password: 'CurrentPass1!', new_password: 'weak' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('PATCH /api/v1/users/me/fcm-token', () => {
  it('updates the FCM token', async () => {
    const user = await createTestUser();
    const { access_token } = await loginAs(user);

    const res = await request(app)
      .patch('/api/v1/users/me/fcm-token')
      .set('Authorization', `Bearer ${access_token}`)
      .send({ fcm_token: 'fcm-device-token-abc' });

    expect(res.status).toBe(200);

    const row = await db.query('SELECT fcm_token FROM users WHERE id = $1', [user.id]);
    expect(row.rows[0].fcm_token).toBe('fcm-device-token-abc');
  });
});

describe('DELETE /api/v1/users/me', () => {
  it('soft-deletes the account and revokes refresh tokens', async () => {
    const user = await createTestUser({ password: 'StrongPass1!' });
    const { access_token, refresh_token } = await loginAs(user);

    const res = await request(app)
      .delete('/api/v1/users/me')
      .set('Authorization', `Bearer ${access_token}`);

    expect(res.status).toBe(200);

    // User is soft-deleted
    const row = await db.query('SELECT deleted_at FROM users WHERE id = $1', [user.id]);
    expect(row.rows[0].deleted_at).not.toBeNull();

    // Refresh token revoked
    const refresh = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refresh_token });
    expect(refresh.status).toBe(401);
  });
});

describe('User Addresses CRUD', () => {
  const validAddress = {
    label: 'Home',
    street: '12 Rue Hassan II, Apt 3',
    district: 'Maârif',
    city: 'Casablanca',
    landmark: 'Facing Carrefour',
    notes: '2nd floor, ring bell',
  };

  it('GET /users/me/addresses returns empty list initially', async () => {
    const user = await createTestUser();
    const { access_token } = await loginAs(user);

    const res = await request(app)
      .get('/api/v1/users/me/addresses')
      .set('Authorization', `Bearer ${access_token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.addresses).toEqual([]);
  });

  it('POST /users/me/addresses creates first address as default', async () => {
    const user = await createTestUser();
    const { access_token } = await loginAs(user);

    const res = await request(app)
      .post('/api/v1/users/me/addresses')
      .set('Authorization', `Bearer ${access_token}`)
      .send({ ...validAddress, is_default: false }); // user said false; we force true

    expect(res.status).toBe(201);
    expect(res.body.data.address.is_default).toBe(true);
    expect(res.body.data.address.label).toBe('Home');
  });

  it('Second address respects is_default=false', async () => {
    const user = await createTestUser();
    const { access_token } = await loginAs(user);

    await request(app)
      .post('/api/v1/users/me/addresses')
      .set('Authorization', `Bearer ${access_token}`)
      .send(validAddress);

    const res = await request(app)
      .post('/api/v1/users/me/addresses')
      .set('Authorization', `Bearer ${access_token}`)
      .send({ ...validAddress, label: 'Work' });

    expect(res.status).toBe(201);
    expect(res.body.data.address.is_default).toBe(false);
    expect(res.body.data.address.label).toBe('Work');
  });

  it('PATCH /:id/default switches default atomically', async () => {
    const user = await createTestUser();
    const { access_token } = await loginAs(user);

    const a1 = (await request(app)
      .post('/api/v1/users/me/addresses')
      .set('Authorization', `Bearer ${access_token}`)
      .send(validAddress)).body.data.address;

    const a2 = (await request(app)
      .post('/api/v1/users/me/addresses')
      .set('Authorization', `Bearer ${access_token}`)
      .send({ ...validAddress, label: 'Work' })).body.data.address;

    const res = await request(app)
      .patch(`/api/v1/users/me/addresses/${a2.id}/default`)
      .set('Authorization', `Bearer ${access_token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.address.is_default).toBe(true);

    // a1 should no longer be default
    const list = await request(app)
      .get('/api/v1/users/me/addresses')
      .set('Authorization', `Bearer ${access_token}`);

    const a1After = list.body.data.addresses.find((a) => a.id === a1.id);
    expect(a1After.is_default).toBe(false);
  });

  it('returns 404 when accessing another user\'s address', async () => {
    const alice = await createTestUser();
    const aliceAuth = await loginAs(alice);

    const a1 = (await request(app)
      .post('/api/v1/users/me/addresses')
      .set('Authorization', `Bearer ${aliceAuth.access_token}`)
      .send(validAddress)).body.data.address;

    const bob = await createTestUser();
    const bobAuth = await loginAs(bob);

    const res = await request(app)
      .get(`/api/v1/users/me/addresses/${a1.id}`)
      .set('Authorization', `Bearer ${bobAuth.access_token}`);

    expect(res.status).toBe(404);
  });

  it('DELETE promotes next address to default when default is deleted', async () => {
    const user = await createTestUser();
    const { access_token } = await loginAs(user);

    const a1 = (await request(app)
      .post('/api/v1/users/me/addresses')
      .set('Authorization', `Bearer ${access_token}`)
      .send(validAddress)).body.data.address;

    const a2 = (await request(app)
      .post('/api/v1/users/me/addresses')
      .set('Authorization', `Bearer ${access_token}`)
      .send({ ...validAddress, label: 'Work' })).body.data.address;

    await request(app)
      .delete(`/api/v1/users/me/addresses/${a1.id}`)
      .set('Authorization', `Bearer ${access_token}`)
      .expect(200);

    const list = await request(app)
      .get('/api/v1/users/me/addresses')
      .set('Authorization', `Bearer ${access_token}`);

    expect(list.body.data.addresses).toHaveLength(1);
    expect(list.body.data.addresses[0].id).toBe(a2.id);
    expect(list.body.data.addresses[0].is_default).toBe(true);
  });
});
