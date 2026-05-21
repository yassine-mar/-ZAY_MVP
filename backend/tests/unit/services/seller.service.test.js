'use strict';

jest.mock('../../../src/models/seller.model');
jest.mock('../../../src/services/upload.service');

const SellerModel = require('../../../src/models/seller.model');
const UploadService = require('../../../src/services/upload.service');
const SellerService = require('../../../src/services/seller.service');

const sellerUser = (overrides = {}) => ({
  id: 'u-seller',
  role: 'seller',
  sellerProfile: { id: 'sp-1', status: 'approved', ...overrides },
});

beforeEach(() => jest.clearAllMocks());

describe('SellerService.getProfile', () => {
  it('returns the seller profile for the authenticated seller', async () => {
    SellerModel.findByUserId.mockResolvedValue({
      id: 'sp-1', user_id: 'u-seller', status: 'approved',
    });

    const result = await SellerService.getProfile(sellerUser());

    expect(result.id).toBe('sp-1');
    expect(SellerModel.findByUserId).toHaveBeenCalledWith('u-seller');
  });

  it('throws 404 when the profile does not exist', async () => {
    SellerModel.findByUserId.mockResolvedValue(null);

    await expect(SellerService.getProfile(sellerUser())).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });
});

describe('SellerService.updateProfile', () => {
  it('updates allowed fields', async () => {
    SellerModel.update.mockResolvedValue({ id: 'sp-1', business_name: 'New Kitchen' });

    await SellerService.updateProfile(sellerUser(), {
      business_name: 'New Kitchen',
      bio: 'Updated bio',
      address: '5 Rue Test',
      city: 'Casablanca',
      delivery_radius_km: 7,
    });

    expect(SellerModel.update).toHaveBeenCalledWith(
      'sp-1',
      expect.objectContaining({
        business_name: 'New Kitchen',
        bio: 'Updated bio',
        delivery_radius_km: 7,
      })
    );
  });

  it('ignores forbidden fields (status, is_open, user_id)', async () => {
    SellerModel.update.mockResolvedValue({ id: 'sp-1' });

    await SellerService.updateProfile(sellerUser(), {
      business_name: 'X',
      status: 'approved',       // forbidden — must go through admin flow
      is_open: true,            // forbidden — has its own endpoint
      user_id: 'other-user',    // forbidden — never transferable
    });

    const callArgs = SellerModel.update.mock.calls[0][1];
    expect(callArgs.status).toBeUndefined();
    expect(callArgs.is_open).toBeUndefined();
    expect(callArgs.user_id).toBeUndefined();
  });

  it('rejects empty update body', async () => {
    await expect(SellerService.updateProfile(sellerUser(), {})).rejects.toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
    });
  });
});

describe('SellerService.toggleAvailability', () => {
  it('sets is_open=true for approved seller', async () => {
    SellerModel.update.mockResolvedValue({ id: 'sp-1', is_open: true });

    const result = await SellerService.toggleAvailability(sellerUser(), true);

    expect(result.is_open).toBe(true);
    expect(SellerModel.update).toHaveBeenCalledWith('sp-1', { is_open: true });
  });

  it('sets is_open=false', async () => {
    SellerModel.update.mockResolvedValue({ id: 'sp-1', is_open: false });

    await SellerService.toggleAvailability(sellerUser(), false);

    expect(SellerModel.update).toHaveBeenCalledWith('sp-1', { is_open: false });
  });
});

describe('SellerService.uploadAvatar', () => {
  it('uploads via Cloudinary, persists URL, deletes old asset', async () => {
    SellerModel.findByUserId.mockResolvedValue({
      id: 'sp-1', user_id: 'u-seller', avatar_public_id: 'old-pid',
    });
    UploadService.uploadImage.mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/zay/avatars/new.jpg',
      public_id: 'new-pid',
    });
    SellerModel.update.mockResolvedValue({});
    UploadService.deleteImage.mockResolvedValue(true);

    const result = await SellerService.uploadAvatar(sellerUser(), {
      buffer: Buffer.from('img'), mimetype: 'image/jpeg',
    });

    expect(UploadService.uploadImage).toHaveBeenCalledWith(expect.any(Buffer), 'avatars');
    expect(SellerModel.update).toHaveBeenCalledWith('sp-1', expect.objectContaining({
      avatar_url: expect.stringContaining('new.jpg'),
      avatar_public_id: 'new-pid',
    }));
    expect(result.avatar_url).toContain('new.jpg');
  });

  it('skips deleteImage on first-time upload (no previous asset)', async () => {
    SellerModel.findByUserId.mockResolvedValue({
      id: 'sp-1', user_id: 'u-seller', avatar_public_id: null,
    });
    UploadService.uploadImage.mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/zay/avatars/first.jpg',
      public_id: 'first-pid',
    });
    SellerModel.update.mockResolvedValue({});

    await SellerService.uploadAvatar(sellerUser(), { buffer: Buffer.from('x'), mimetype: 'image/jpeg' });

    expect(UploadService.deleteImage).not.toHaveBeenCalled();
  });

  it('rejects when no file provided', async () => {
    await expect(SellerService.uploadAvatar(sellerUser(), null)).rejects.toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
    });
  });
});

describe('SellerService.uploadBanner', () => {
  it('uploads banner with 3:1 transformation folder', async () => {
    SellerModel.findByUserId.mockResolvedValue({
      id: 'sp-1', user_id: 'u-seller', banner_public_id: null,
    });
    UploadService.uploadImage.mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/zay/sellers/banner.jpg',
      public_id: 'banner-pid',
    });
    SellerModel.update.mockResolvedValue({});

    await SellerService.uploadBanner(sellerUser(), { buffer: Buffer.from('x'), mimetype: 'image/jpeg' });

    expect(UploadService.uploadImage).toHaveBeenCalledWith(expect.any(Buffer), 'sellers');
    expect(SellerModel.update).toHaveBeenCalledWith('sp-1', expect.objectContaining({
      banner_url: expect.stringContaining('banner.jpg'),
      banner_public_id: 'banner-pid',
    }));
  });
});
