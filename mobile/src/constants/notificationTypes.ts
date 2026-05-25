/**
 * Notification taxonomy.
 *
 * Mirrors the backend `notification_type` enum exactly. When a row arrives
 * with an unknown type, the inbox falls back to a generic icon and the deep
 * link is ignored (no crash on forward-compat).
 */
export type NotificationType =
  // Customer-facing
  | 'order_accepted'
  | 'order_preparing'
  | 'order_ready'
  | 'order_delivered'
  | 'order_cancelled'
  | 'order_auto_cancelled'

  // Seller-facing
  | 'order_placed'
  | 'seller_approved'
  | 'seller_rejected'
  | 'seller_suspended'

  // Admin-facing
  | 'admin_seller_registered'
  | 'admin_order_escalation'

  // Generic system
  | 'system';

/** A notification row from /notifications. */
export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  order_id: string | null;
  data: Record<string, unknown> | null;
  is_read: boolean;
  fcm_sent: boolean;
  read_at: string | null;
  created_at: string;
}

/**
 * Where to navigate when a notification of this type is tapped.
 *
 *   - `tab` + `screen` + `params` for a route inside the authenticated tree
 *   - `null` for a "stay where you are" (e.g. seller_approved — the auth
 *     store will flip and RootNavigator handles the rest)
 */
export type DeepLinkTarget =
  | {
      tab: 'HomeTab' | 'OrdersTab';
      screen: 'OrderTracking' | 'SellerProfile' | 'FoodDetails';
      params: Record<string, string>;
    }
  | {
      tab: 'SellerOrdersTab' | 'DashboardTab' | 'SellerMenuTab' | 'SellerProfileTab';
      screen?: 'SellerOrderDetail';
      params?: Record<string, string>;
    }
  | null;

/**
 * Resolve a notification's tap target. Takes the user role because the same
 * order id means different screens for customers vs sellers.
 */
export function resolveDeepLink(
  n: Pick<Notification, 'type' | 'order_id' | 'data'>,
  role: 'customer' | 'seller' | 'admin',
): DeepLinkTarget {
  switch (n.type) {
    case 'order_placed':
      if (role !== 'seller' || !n.order_id) return null;
      return {
        tab: 'SellerOrdersTab',
        screen: 'SellerOrderDetail',
        params: { orderId: n.order_id },
      };

    case 'order_accepted':
    case 'order_preparing':
    case 'order_ready':
    case 'order_delivered':
    case 'order_cancelled':
    case 'order_auto_cancelled':
      if (role !== 'customer' || !n.order_id) return null;
      return {
        tab: 'OrdersTab',
        screen: 'OrderTracking',
        params: { orderId: n.order_id },
      };

    case 'seller_approved':
    case 'seller_rejected':
    case 'seller_suspended':
      // Auth store refresh + RootNavigator handle these; no in-tree nav.
      return null;

    case 'admin_seller_registered':
    case 'admin_order_escalation':
    case 'system':
      return null;
  }
}
