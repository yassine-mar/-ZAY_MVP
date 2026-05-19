'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

jest.mock('../../../src/models/user.model');
jest.mock('../../../src/models/seller.model');
jest.mock('../../../src/models/refreshToken.model');
jest.mock('../../../src/models/base.model', () => ({
  query: jest.fn(),
  withTransaction: jest.fn(async (cb) => cb({ query: jest.fn() })),
}));

const UserModel = require('../../../src/models/user.model');
const SellerModel = require('../../../src/models/seller.model');
const RefreshTokenModel = require('../../../src/models/refreshToken.model');
const AuthService = require('../../../src/services/auth.service');
const env = require('../../../src/config/env');

const validRegister = {
  name: 'Fatima',
  email: 'fatima@example.com',
  phone: '+212612345678',
  password: 'StrongPass1!',
};

describe('AuthService.register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a customer and returns user + tokens', async () => {
    UserModel.existsByEmail.mockResolvedValue(false);
    UserModel.create.mockResolvedValue({
      id: 'user-1',
      name: 'Fatima',
      email: 'fatima@example.com',
      role: 'customer',
      status: 'active',
    });
    RefreshTokenModel.create.mockResolvedValue({ id: 'rt-1' });

    const result = await AuthService.register(validRegister);

    expect(UserModel.existsByEmail).toHaveBeenCalledWith('fatima@example.com');
    expect(UserModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Fatima',
        email: 'fatima@example.com',
        role: 'customer',
        passwordHash: expect.stringMatching(/^\$2[aby]\$/),
      }),
      undefined
    );
    expect(result.user.id).toBe('user-1');
    expect(result.tokens.access_token).toBeDefined();
    expect(result.tokens.refresh_token).toBeDefined();
    expect(result.tokens.token_type).toBe('Bearer');
  });

  it('rejects duplicate email with 409 CONFLICT', async () => {
    UserModel.existsByEmail.mockResolvedValue(true);

    await expect(AuthService.register(validRegister)).rejects.toMatchObject({
      statusCode: 409,
      code: 'CONFLICT',
    });
    expect(UserModel.create).not.toHaveBeenCalled();
  });

  it('lowercases the email before storage', async () => {
    UserModel.existsByEmail.mockResolvedValue(false);
    UserModel.create.mockResolvedValue({ id: 'user-1', role: 'customer' });
    RefreshTokenModel.create.mockResolvedValue({});

    await AuthService.register({ ...validRegister, email: 'Fatima@EXAMPLE.com' });

    expect(UserModel.existsByEmail).toHaveBeenCalledWith('fatima@example.com');
    expect(UserModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'fatima@example.com' }),
      undefined
    );
  });

  it('hashes password with bcrypt cost 12', async () => {
    UserModel.existsByEmail.mockResolvedValue(false);
    UserModel.create.mockResolvedValue({ id: 'user-1', role: 'customer' });
    RefreshTokenModel.create.mockResolvedValue({});

    await AuthService.register(validRegister);

    const call = UserModel.create.mock.calls[0][0];
    expect(call.passwordHash).toMatch(/^\$2[aby]\$12\$/);
    const matches = await bcrypt.compare('StrongPass1!', call.passwordHash);
    expect(matches).toBe(true);
  });
});

describe('AuthService.login', () => {
  const credentials = { email: 'fatima@example.com', password: 'StrongPass1!' };
  let userRow;

  beforeEach(async () => {
    jest.clearAllMocks();
    const hash = await bcrypt.hash('StrongPass1!', 4);
    userRow = {
      id: 'user-1',
      name: 'Fatima',
      email: 'fatima@example.com',
      password_hash: hash,
      role: 'customer',
      status: 'active',
    };
  });

  it('logs in with valid credentials', async () => {
    UserModel.findByEmailWithPassword.mockResolvedValue(userRow);
    RefreshTokenModel.create.mockResolvedValue({});

    const result = await AuthService.login(credentials);

    expect(result.user.id).toBe('user-1');
    const decoded = jwt.verify(result.tokens.access_token, env.JWT_SECRET);
    expect(decoded.sub).toBe('user-1');
    expect(decoded.role).toBe('customer');
  });

  it('returns INVALID_CREDENTIALS for unknown email (no enumeration)', async () => {
    UserModel.findByEmailWithPassword.mockResolvedValue(null);

    await expect(AuthService.login(credentials)).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password',
    });
  });

  it('returns INVALID_CREDENTIALS for wrong password', async () => {
    UserModel.findByEmailWithPassword.mockResolvedValue(userRow);

    await expect(AuthService.login({ ...credentials, password: 'WrongPass1!' })).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    });
  });

  it('runs bcrypt.compare even when user not found (timing-safe)', async () => {
    UserModel.findByEmailWithPassword.mockResolvedValue(null);
    const compareSpy = jest.spyOn(bcrypt, 'compare');

    await expect(AuthService.login(credentials)).rejects.toThrow();
    expect(compareSpy).toHaveBeenCalled();

    compareSpy.mockRestore();
  });

  it('returns 403 ACCOUNT_SUSPENDED for suspended user', async () => {
    UserModel.findByEmailWithPassword.mockResolvedValue({ ...userRow, status: 'suspended' });

    await expect(AuthService.login(credentials)).rejects.toMatchObject({
      statusCode: 403,
      code: 'ACCOUNT_SUSPENDED',
    });
  });

  it('includes seller_status in JWT for seller role', async () => {
    UserModel.findByEmailWithPassword.mockResolvedValue({ ...userRow, role: 'seller' });
    SellerModel.findByUserId.mockResolvedValue({ status: 'approved' });
    RefreshTokenModel.create.mockResolvedValue({});

    const result = await AuthService.login(credentials);

    const decoded = jwt.verify(result.tokens.access_token, env.JWT_SECRET);
    expect(decoded.role).toBe('seller');
    expect(decoded.seller_status).toBe('approved');
  });
});

describe('AuthService.adminLogin', () => {
  const credentials = { email: 'admin@zay.ma', password: 'AdminPass1!' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns admin token signed with ADMIN_JWT_SECRET', async () => {
    const hash = await bcrypt.hash('AdminPass1!', 4);
    UserModel.findByEmailWithPassword.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@zay.ma',
      password_hash: hash,
      role: 'admin',
      status: 'active',
    });

    const result = await AuthService.adminLogin(credentials);

    // verify with the admin secret — would throw if signed with JWT_SECRET
    const decoded = jwt.verify(result.accessToken, env.ADMIN_JWT_SECRET);
    expect(decoded.role).toBe('admin');
    expect(decoded.isAdmin).toBe(true);

    // explicitly check it does NOT verify with user secret
    expect(() => jwt.verify(result.accessToken, env.JWT_SECRET)).toThrow();
  });

  it('rejects non-admin users even with valid credentials', async () => {
    const hash = await bcrypt.hash('AdminPass1!', 4);
    UserModel.findByEmailWithPassword.mockResolvedValue({
      id: 'user-1',
      password_hash: hash,
      role: 'customer',
      status: 'active',
    });

    await expect(AuthService.adminLogin(credentials)).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    });
  });
});

describe('AuthService.refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rotates a valid refresh token', async () => {
    const tokenHash = require('crypto').createHash('sha256').update('valid-token').digest('hex');
    RefreshTokenModel.findByHash.mockResolvedValue({
      id: 'rt-1',
      user_id: 'user-1',
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + 86_400_000),
      used_at: null,
      revoked_at: null,
    });
    UserModel.findById.mockResolvedValue({
      id: 'user-1',
      role: 'customer',
      status: 'active',
    });
    RefreshTokenModel.rotate.mockResolvedValue({ newId: 'rt-2' });

    const result = await AuthService.refresh({ refresh_token: 'valid-token' });

    expect(result.access_token).toBeDefined();
    expect(result.refresh_token).toBeDefined();
    expect(result.refresh_token).not.toBe('valid-token');
    expect(RefreshTokenModel.rotate).toHaveBeenCalledWith(
      expect.objectContaining({ oldId: 'rt-1', userId: 'user-1' })
    );
  });

  it('rejects unknown refresh token', async () => {
    RefreshTokenModel.findByHash.mockResolvedValue(null);

    await expect(AuthService.refresh({ refresh_token: 'unknown' })).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_REFRESH_TOKEN',
    });
  });

  it('rejects revoked token', async () => {
    RefreshTokenModel.findByHash.mockResolvedValue({
      id: 'rt-1',
      user_id: 'user-1',
      expires_at: new Date(Date.now() + 86_400_000),
      revoked_at: new Date(),
    });

    await expect(AuthService.refresh({ refresh_token: 'revoked' })).rejects.toMatchObject({
      code: 'INVALID_REFRESH_TOKEN',
    });
  });

  it('rejects expired token', async () => {
    RefreshTokenModel.findByHash.mockResolvedValue({
      id: 'rt-1',
      user_id: 'user-1',
      expires_at: new Date(Date.now() - 1000),
      used_at: null,
      revoked_at: null,
    });

    await expect(AuthService.refresh({ refresh_token: 'expired' })).rejects.toMatchObject({
      code: 'INVALID_REFRESH_TOKEN',
    });
  });

  it('detects reuse and revokes entire user family', async () => {
    RefreshTokenModel.findByHash.mockResolvedValue({
      id: 'rt-1',
      user_id: 'user-1',
      expires_at: new Date(Date.now() + 86_400_000),
      used_at: new Date(),         // <-- already used
      revoked_at: null,
    });
    RefreshTokenModel.revokeAllForUser.mockResolvedValue(3);

    await expect(AuthService.refresh({ refresh_token: 'reused' })).rejects.toMatchObject({
      code: 'INVALID_REFRESH_TOKEN',
    });
    expect(RefreshTokenModel.revokeAllForUser).toHaveBeenCalledWith('user-1');
  });

  it('revokes family when owning user is suspended', async () => {
    RefreshTokenModel.findByHash.mockResolvedValue({
      id: 'rt-1',
      user_id: 'user-1',
      expires_at: new Date(Date.now() + 86_400_000),
      used_at: null,
      revoked_at: null,
    });
    UserModel.findById.mockResolvedValue({
      id: 'user-1',
      role: 'customer',
      status: 'suspended',
    });
    RefreshTokenModel.revokeAllForUser.mockResolvedValue(2);

    await expect(AuthService.refresh({ refresh_token: 'valid' })).rejects.toMatchObject({
      code: 'INVALID_REFRESH_TOKEN',
    });
    expect(RefreshTokenModel.revokeAllForUser).toHaveBeenCalledWith('user-1');
  });
});

describe('AuthService.logout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('clears FCM token and revokes the presented refresh token', async () => {
    UserModel.clearFcmToken.mockResolvedValue();
    RefreshTokenModel.revokeByHash.mockResolvedValue();

    await AuthService.logout('user-1', 'some-refresh-token');

    expect(UserModel.clearFcmToken).toHaveBeenCalledWith('user-1');
    expect(RefreshTokenModel.revokeByHash).toHaveBeenCalled();
  });

  it('still clears FCM token even when no refresh token provided', async () => {
    UserModel.clearFcmToken.mockResolvedValue();

    await AuthService.logout('user-1', null);

    expect(UserModel.clearFcmToken).toHaveBeenCalledWith('user-1');
    expect(RefreshTokenModel.revokeByHash).not.toHaveBeenCalled();
  });
});
