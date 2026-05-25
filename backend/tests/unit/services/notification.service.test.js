'use strict';

/**
 * Unit tests for the notification service.
 *
 * Architecture under test (per services/notification.service.js):
 *   - DB row is created FIRST (source of truth)
 *   - FCM is attempted only if user has a token AND firebase is wired
 *   - FCM success → markFcmSent
 *   - FCM failure → markFcmError + log warn (does NOT throw)
 *   - DB failure → log error, return null (does NOT throw — callers proceed)
 *
 * We mock:
 *   - firebase config (so tests don't need credentials)
 *   - the notification model + user model
 *   - the base.model `query` (used by admin fan-out)
 *   - the logger (asserted on for warn/error)
 */

// Mock BEFORE requiring the service so the inner `require('../config/firebase')`
// inside notification.service picks up the mock.
const mockSend = jest.fn();
jest.mock('../../../src/config/firebase', () => ({
  messaging: { send: mockSend },
}));

jest.mock('../../../src/models/notification.model');
jest.mock('../../../src/models/user.model');
jest.mock('../../../src/models/base.model', () => ({ query: jest.fn() }));
jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const NotificationModel = require('../../../src/models/notification.model');
const UserModel = require('../../../src/models/user.model');
const { query } = require('../../../src/models/base.model');
const logger = require('../../../src/utils/logger');

const NotificationService = require('../../../src/services/notification.service');

/* ── Helpers ───────────────────────────────────────────────────────────── */

const buildNotificationRow = (overrides = {}) => ({
  id: 'notif-1',
  user_id: 'user-1',
  type: 'order_placed',
  title: 'New order',
  body: 'New order for 240 MAD.',
  order_id: 'order-1',
  data: null,
  is_read: false,
  fcm_sent: false,
  fcm_error: null,
  read_at: null,
  created_at: new Date(),
  ...overrides,
});

const orderFixture = { id: 'order-1', total_amount: 240 };

/* ── sendNotification — the two-track contract ────────────────────────── */

describe('NotificationService.sendNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset admin cache between tests so each one starts cold.
    NotificationService.invalidateAdminCache();
  });

  it('always creates the DB row first (source of truth)', async () => {
    NotificationModel.create.mockResolvedValue(buildNotificationRow());
    UserModel.getFcmToken.mockResolvedValue(null);

    await NotificationService.sendNotification({
      userId: 'user-1',
      type: 'system',
      title: 't',
      body: 'b',
    });

    expect(NotificationModel.create).toHaveBeenCalledWith({
      userId: 'user-1',
      type: 'system',
      title: 't',
      body: 'b',
      orderId: null,
      data: null,
    });
  });

  it('skips FCM when the user has no token', async () => {
    NotificationModel.create.mockResolvedValue(buildNotificationRow());
    UserModel.getFcmToken.mockResolvedValue(null);

    await NotificationService.sendNotification({
      userId: 'user-1', type: 'system', title: 't', body: 'b',
    });

    expect(mockSend).not.toHaveBeenCalled();
    expect(NotificationModel.markFcmSent).not.toHaveBeenCalled();
  });

  it('sends FCM and marks fcm_sent on success', async () => {
    NotificationModel.create.mockResolvedValue(buildNotificationRow());
    UserModel.getFcmToken.mockResolvedValue('fcm-token-abc');
    mockSend.mockResolvedValue('ok');

    await NotificationService.sendNotification({
      userId: 'user-1',
      type: 'order_placed',
      title: 'New order',
      body: 'You have a new order.',
      orderId: 'order-1',
    });

    expect(mockSend).toHaveBeenCalledWith({
      token: 'fcm-token-abc',
      notification: { title: 'New order', body: 'You have a new order.' },
      data: expect.objectContaining({ type: 'order_placed', order_id: 'order-1' }),
    });
    expect(NotificationModel.markFcmSent).toHaveBeenCalledWith('notif-1');
    expect(NotificationModel.markFcmError).not.toHaveBeenCalled();
  });

  it('coerces extra data fields to strings (FCM data must be string-valued)', async () => {
    NotificationModel.create.mockResolvedValue(buildNotificationRow());
    UserModel.getFcmToken.mockResolvedValue('fcm-token-abc');
    mockSend.mockResolvedValue('ok');

    await NotificationService.sendNotification({
      userId: 'user-1',
      type: 'order_placed',
      title: 't',
      body: 'b',
      orderId: 'order-1',
      data: { count: 3, auto_cancelled: true },
    });

    const call = mockSend.mock.calls[0][0];
    expect(call.data.count).toBe('3');
    expect(call.data.auto_cancelled).toBe('true');
  });

  it('marks fcm_error (truncated) on FCM failure and does NOT throw', async () => {
    NotificationModel.create.mockResolvedValue(buildNotificationRow());
    UserModel.getFcmToken.mockResolvedValue('fcm-token-abc');
    const longErr = 'x'.repeat(1500);
    mockSend.mockRejectedValue(new Error(longErr));

    await expect(
      NotificationService.sendNotification({
        userId: 'user-1', type: 'system', title: 't', body: 'b',
      })
    ).resolves.not.toThrow();

    expect(NotificationModel.markFcmError).toHaveBeenCalledTimes(1);
    const [, savedErr] = NotificationModel.markFcmError.mock.calls[0];
    expect(savedErr.length).toBeLessThanOrEqual(1000);
    expect(logger.warn).toHaveBeenCalledWith(
      'FCM delivery failed',
      expect.objectContaining({ userId: 'user-1' })
    );
  });

  it('swallows DB errors and returns null (never breaks the calling flow)', async () => {
    NotificationModel.create.mockRejectedValue(new Error('connection refused'));

    const result = await NotificationService.sendNotification({
      userId: 'user-1', type: 'system', title: 't', body: 'b',
    });

    expect(result).toBeNull();
    expect(logger.error).toHaveBeenCalledWith(
      'Notification create failed',
      expect.objectContaining({ userId: 'user-1' })
    );
    expect(mockSend).not.toHaveBeenCalled();
  });
});

/* ── Typed helpers ─────────────────────────────────────────────────────── */

describe('NotificationService typed helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    NotificationModel.create.mockResolvedValue(buildNotificationRow());
    UserModel.getFcmToken.mockResolvedValue(null);
  });

  it('notifyOrderPlaced targets the seller user with type=order_placed', async () => {
    await NotificationService.notifyOrderPlaced({
      order: orderFixture, sellerUserId: 'seller-user-1',
    });

    expect(NotificationModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'seller-user-1',
        type: 'order_placed',
        orderId: 'order-1',
      })
    );
  });

  it.each([
    ['accepted',  'order_accepted'],
    ['preparing', 'order_preparing'],
    ['ready',     'order_ready'],
    ['delivered', 'order_delivered'],
    ['cancelled', 'order_cancelled'],
  ])('notifyOrderStatusChanged maps %s → %s', async (newStatus, expectedType) => {
    await NotificationService.notifyOrderStatusChanged({
      order: orderFixture, recipientId: 'user-1', newStatus,
    });

    expect(NotificationModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: expectedType, userId: 'user-1' })
    );
  });

  it('notifyOrderStatusChanged returns null for an unknown status', async () => {
    const result = await NotificationService.notifyOrderStatusChanged({
      order: orderFixture, recipientId: 'user-1', newStatus: 'mystery-status',
    });
    expect(result).toBeNull();
    expect(NotificationModel.create).not.toHaveBeenCalled();
  });

  it('notifySellerApproved targets the seller user', async () => {
    await NotificationService.notifySellerApproved({ userId: 'seller-1' });
    expect(NotificationModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'seller-1', type: 'seller_approved' })
    );
  });
});

/* ── Admin fan-out ─────────────────────────────────────────────────────── */

describe('NotificationService admin fan-out', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    NotificationService.invalidateAdminCache();
    NotificationModel.create.mockResolvedValue(buildNotificationRow());
    UserModel.getFcmToken.mockResolvedValue(null);
  });

  it('queries active admins and sends one notification per admin', async () => {
    query.mockResolvedValue({
      rows: [{ id: 'admin-1' }, { id: 'admin-2' }, { id: 'admin-3' }],
    });

    await NotificationService.notifyAdminsSellerRegistered({
      businessName: 'Dar Atika',
      sellerId: 'seller-7',
    });

    expect(NotificationModel.create).toHaveBeenCalledTimes(3);
    const recipients = NotificationModel.create.mock.calls.map((c) => c[0].userId);
    expect(recipients).toEqual(expect.arrayContaining(['admin-1', 'admin-2', 'admin-3']));
    expect(NotificationModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'admin_seller_registered',
        data: expect.objectContaining({ seller_id: 'seller-7' }),
      })
    );
  });

  it('caches the admin list (no double-query within 60s)', async () => {
    query.mockResolvedValue({ rows: [{ id: 'admin-1' }] });

    await NotificationService.notifyAdminsSellerRegistered({ businessName: 'A', sellerId: 's-1' });
    await NotificationService.notifyAdminsSellerRegistered({ businessName: 'B', sellerId: 's-2' });

    expect(query).toHaveBeenCalledTimes(1); // second call hit the cache
  });

  it('invalidateAdminCache forces a re-query', async () => {
    query.mockResolvedValue({ rows: [{ id: 'admin-1' }] });

    await NotificationService.notifyAdminsSellerRegistered({ businessName: 'A', sellerId: 's-1' });
    NotificationService.invalidateAdminCache();
    await NotificationService.notifyAdminsSellerRegistered({ businessName: 'B', sellerId: 's-2' });

    expect(query).toHaveBeenCalledTimes(2);
  });

  it('one admin failing does NOT block the others (Promise.allSettled)', async () => {
    query.mockResolvedValue({ rows: [{ id: 'admin-1' }, { id: 'admin-2' }] });
    NotificationModel.create
      .mockRejectedValueOnce(new Error('DB hiccup for admin-1'))
      .mockResolvedValueOnce(buildNotificationRow({ user_id: 'admin-2' }));

    await expect(
      NotificationService.notifyAdminsSellerRegistered({
        businessName: 'Dar X', sellerId: 's-1',
      })
    ).resolves.not.toThrow();

    // Both calls were attempted — Promise.allSettled doesn't short-circuit.
    expect(NotificationModel.create).toHaveBeenCalledTimes(2);
  });
});
