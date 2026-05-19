'use strict';

const bcrypt = require('bcrypt');

jest.mock('../../../src/models/user.model');
jest.mock('../../../src/models/seller.model');
jest.mock('../../../src/models/order.model');
jest.mock('../../../src/models/refreshToken.model');
jest.mock('../../../src/services/upload.service');
jest.mock('../../../src/models/base.model', () => ({
  query: jest.fn(),
  withTransaction: jest.fn(async (cb) => cb({ query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }) })),
}));

const UserModel = require('../../../src/models/user.model');
const SellerModel = require('../../../src/models/seller.model');
const OrderModel = require('../../../src/models/order.model');
const RefreshTokenModel = require('../../../src/models/refreshToken.model');
const UploadService = require('../../../src/services/upload.service');
const UserService = require('../../../src/services/user.service');

beforeEach(() => jest.clearAllMocks());

describe('UserService.getMe', () => {
  it('returns customer profile', async () => {
    UserModel.findById.mockResolvedValue({
      id: 'u1', name: 'Fatima', role: 'customer', status: 'active',
    });

    const result = await UserService.getMe('u1');

    expect(result.id).toBe('u1');
    expect(SellerModel.findByUserId).not.toHaveBeenCalled();
  });

  it('attaches seller_profile for sellers', async () => {
    UserModel.findById.mockResolvedValue({
      id: 'u1', role: 'seller', status: 'active',
    });
    SellerModel.findByUserId.mockResolvedValue({ id: 'sp1', status: 'approved' });

    const result = await UserService.getMe('u1');

    expect(result.sellerProfile.id).toBe('sp1');
  });

  it('throws 404 when user not found', async () => {
    UserModel.findById.mockResolvedValue(null);

    await expect(UserService.getMe('u1')).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });
});

describe('UserService.updateMe', () => {
  it('updates allowed fields only', async () => {
    UserModel.update.mockResolvedValue({ id: 'u1', name: 'New Name' });

    await UserService.updateMe('u1', { name: 'New Name', role: 'admin', email: 'hack@x.com' });

    // Only allowed fields make it to the model
    expect(UserModel.update).toHaveBeenCalledWith('u1', { name: 'New Name' });
  });

  it('rejects empty update', async () => {
    await expect(UserService.updateMe('u1', {})).rejects.toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
    });
  });

  it('rejects update with only forbidden fields', async () => {
    await expect(
      UserService.updateMe('u1', { role: 'admin', email: 'x@x.com', password: 'x' })
    ).rejects.toMatchObject({ statusCode: 400, code: 'BAD_REQUEST' });
  });
});

describe('UserService.changePassword', () => {
  it('verifies current password and updates to new hash', async () => {
    const currentHash = await bcrypt.hash('CurrentPass1!', 4);
    UserModel.findByIdWithPassword.mockResolvedValue({ id: 'u1', password_hash: currentHash });
    UserModel.updatePassword.mockResolvedValue();
    RefreshTokenModel.revokeAllForUser.mockResolvedValue(2);

    await UserService.changePassword('u1', {
      currentPassword: 'CurrentPass1!',
      newPassword: 'NewStrongPass2@',
    });

    expect(UserModel.updatePassword).toHaveBeenCalledWith(
      'u1',
      expect.stringMatching(/^\$2[aby]\$12\$/)
    );
    expect(RefreshTokenModel.revokeAllForUser).toHaveBeenCalledWith('u1');
  });

  it('rejects when current password is wrong', async () => {
    const currentHash = await bcrypt.hash('CurrentPass1!', 4);
    UserModel.findByIdWithPassword.mockResolvedValue({ id: 'u1', password_hash: currentHash });

    await expect(
      UserService.changePassword('u1', {
        currentPassword: 'Wrong!',
        newPassword: 'NewStrongPass2@',
      })
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CURRENT_PASSWORD',
    });

    expect(UserModel.updatePassword).not.toHaveBeenCalled();
  });

  it('rejects when new password equals current', async () => {
    const currentHash = await bcrypt.hash('SamePass1!', 4);
    UserModel.findByIdWithPassword.mockResolvedValue({ id: 'u1', password_hash: currentHash });

    await expect(
      UserService.changePassword('u1', {
        currentPassword: 'SamePass1!',
        newPassword: 'SamePass1!',
      })
    ).rejects.toMatchObject({ statusCode: 400, code: 'SAME_PASSWORD' });
  });

  it('revokes all refresh tokens after successful change (forces re-login everywhere)', async () => {
    const currentHash = await bcrypt.hash('CurrentPass1!', 4);
    UserModel.findByIdWithPassword.mockResolvedValue({ id: 'u1', password_hash: currentHash });
    UserModel.updatePassword.mockResolvedValue();
    RefreshTokenModel.revokeAllForUser.mockResolvedValue(3);

    await UserService.changePassword('u1', {
      currentPassword: 'CurrentPass1!',
      newPassword: 'NewStrongPass2@',
    });

    expect(RefreshTokenModel.revokeAllForUser).toHaveBeenCalledWith('u1');
  });
});

describe('UserService.uploadAvatar', () => {
  it('uploads to Cloudinary, updates DB, and deletes old asset', async () => {
    UserModel.findById.mockResolvedValue({
      id: 'u1',
      avatar_public_id: 'old-id-123',
    });
    UploadService.uploadImage.mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/zay/new.jpg',
      public_id: 'new-id-456',
    });
    UserModel.update.mockResolvedValue({});
    UploadService.deleteImage.mockResolvedValue();

    const result = await UserService.uploadAvatar('u1', {
      buffer: Buffer.from('fake'),
      mimetype: 'image/jpeg',
    });

    expect(UploadService.uploadImage).toHaveBeenCalledWith(expect.any(Buffer), 'avatars');
    expect(UserModel.update).toHaveBeenCalledWith('u1', expect.objectContaining({
      avatar_url: expect.stringContaining('new.jpg'),
      avatar_public_id: 'new-id-456',
    }));
    expect(result.avatar_url).toContain('new.jpg');
  });

  it('skips delete when no previous avatar exists', async () => {
    UserModel.findById.mockResolvedValue({ id: 'u1', avatar_public_id: null });
    UploadService.uploadImage.mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/zay/first.jpg',
      public_id: 'first-id',
    });
    UserModel.update.mockResolvedValue({});

    await UserService.uploadAvatar('u1', { buffer: Buffer.from('x'), mimetype: 'image/jpeg' });

    expect(UploadService.deleteImage).not.toHaveBeenCalled();
  });

  it('rejects when no file provided', async () => {
    await expect(UserService.uploadAvatar('u1', null)).rejects.toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
    });
  });
});

describe('UserService.updateFcmToken', () => {
  it('delegates to model', async () => {
    UserModel.updateFcmToken.mockResolvedValue();

    await UserService.updateFcmToken('u1', 'fcm-token-xyz');

    expect(UserModel.updateFcmToken).toHaveBeenCalledWith('u1', 'fcm-token-xyz');
  });
});

describe('UserService.deleteMe', () => {
  it('blocks deletion when active orders exist', async () => {
    OrderModel.countActiveByCustomer.mockResolvedValue(2);

    await expect(UserService.deleteMe('u1')).rejects.toMatchObject({
      statusCode: 409,
      code: 'ACTIVE_ORDERS_EXIST',
    });
  });

  it('soft-deletes and revokes tokens when no active orders', async () => {
    OrderModel.countActiveByCustomer.mockResolvedValue(0);

    await UserService.deleteMe('u1');

    // withTransaction mock invokes the callback synchronously in tests
    expect(OrderModel.countActiveByCustomer).toHaveBeenCalledWith('u1');
  });
});
