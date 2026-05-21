'use strict';

jest.mock('../../../src/models/seller.model');
jest.mock('../../../src/services/notification.service');

const SellerModel = require('../../../src/models/seller.model');
const NotificationService = require('../../../src/services/notification.service');
const SellerAdminService = require('../../../src/services/admin/seller.admin.service');

beforeEach(() => {
  jest.clearAllMocks();
  NotificationService.notifySellerApproved.mockResolvedValue();
  NotificationService.notifySellerRejected.mockResolvedValue();
  NotificationService.notifySellerSuspended.mockResolvedValue();
});

const ADMIN_ID = 'u-admin';

describe('SellerAdminService.listAll', () => {
  it('returns paginated list with filters', async () => {
    SellerModel.findAll.mockResolvedValue([
      { id: 'sp-1', status: 'pending' },
      { id: 'sp-2', status: 'pending' },
    ]);
    SellerModel.countAll.mockResolvedValue(2);

    const result = await SellerAdminService.listAll({ status: 'pending', page: 1, limit: 20 });

    expect(result.items).toHaveLength(2);
    expect(result.pagination.total).toBe(2);
    expect(SellerModel.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending', limit: 20, offset: 0 })
    );
  });
});

describe('SellerAdminService.approveSeller', () => {
  it('approves a pending seller and notifies', async () => {
    SellerModel.findById.mockResolvedValue({ id: 'sp-1', user_id: 'u-seller', status: 'pending' });
    SellerModel.approve.mockResolvedValue({ id: 'sp-1', status: 'approved', approved_at: new Date() });

    await SellerAdminService.approveSeller('sp-1', ADMIN_ID, 'Welcome');

    expect(SellerModel.approve).toHaveBeenCalledWith('sp-1', { approvedBy: ADMIN_ID });
    expect(NotificationService.notifySellerApproved).toHaveBeenCalledWith({ userId: 'u-seller' });
  });

  it('rejects approving a non-pending seller', async () => {
    SellerModel.findById.mockResolvedValue({ id: 'sp-1', status: 'approved' });

    await expect(
      SellerAdminService.approveSeller('sp-1', ADMIN_ID)
    ).rejects.toMatchObject({ statusCode: 422, code: 'INVALID_STATUS' });

    expect(SellerModel.approve).not.toHaveBeenCalled();
  });

  it('throws 404 when seller does not exist', async () => {
    SellerModel.findById.mockResolvedValue(null);

    await expect(
      SellerAdminService.approveSeller('sp-missing', ADMIN_ID)
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });
});

describe('SellerAdminService.rejectSeller', () => {
  it('rejects a pending seller with reason', async () => {
    SellerModel.findById.mockResolvedValue({ id: 'sp-1', user_id: 'u-seller', status: 'pending' });
    SellerModel.reject.mockResolvedValue({ id: 'sp-1', status: 'rejected', rejection_reason: 'Incomplete' });

    await SellerAdminService.rejectSeller('sp-1', ADMIN_ID, 'Incomplete documents');

    expect(SellerModel.reject).toHaveBeenCalledWith('sp-1', {
      reason: 'Incomplete documents',
      rejectedBy: ADMIN_ID,
    });
    expect(NotificationService.notifySellerRejected).toHaveBeenCalledWith({
      userId: 'u-seller',
      reason: 'Incomplete documents',
    });
  });

  it('refuses to reject an already-approved seller', async () => {
    SellerModel.findById.mockResolvedValue({ id: 'sp-1', status: 'approved' });

    await expect(
      SellerAdminService.rejectSeller('sp-1', ADMIN_ID, 'Late check')
    ).rejects.toMatchObject({ statusCode: 422, code: 'INVALID_STATUS' });
  });
});

describe('SellerAdminService.suspendSeller', () => {
  it('suspends an approved seller', async () => {
    SellerModel.findById.mockResolvedValue({ id: 'sp-1', user_id: 'u-seller', status: 'approved' });
    SellerModel.suspend.mockResolvedValue({ id: 'sp-1', status: 'suspended' });

    await SellerAdminService.suspendSeller('sp-1', ADMIN_ID, 'Policy violation');

    expect(SellerModel.suspend).toHaveBeenCalledWith('sp-1', {
      reason: 'Policy violation',
      suspendedBy: ADMIN_ID,
    });
    expect(NotificationService.notifySellerSuspended).toHaveBeenCalled();
  });

  it('refuses to suspend a non-approved seller', async () => {
    SellerModel.findById.mockResolvedValue({ id: 'sp-1', status: 'pending' });

    await expect(
      SellerAdminService.suspendSeller('sp-1', ADMIN_ID, 'X')
    ).rejects.toMatchObject({ statusCode: 422, code: 'INVALID_STATUS' });
  });
});
