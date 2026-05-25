/**
 * Lightweight socket.io wrapper for real-time order updates.
 * Imports socket.io-client lazily so the auth-only path never pulls it
 * into the bundle.
 *
 * Lifecycle:
 *   - call connect(token) right after login (and on hydrate when a token
 *     already exists)
 *   - call disconnect() on logout
 *   - hooks (useOrderUpdates) subscribe per-screen
 *
 * Reconnection: socket.io handles it automatically (exponential backoff).
 * AppState foreground/background handling lands in a later slice.
 */
import { API_URL } from '@/constants/api';
import type { OrderStatus } from '@/types/domain.types';

type Listener<T> = (payload: T) => void;

export interface OrderStatusChangedPayload {
  order_id: string;
  status: OrderStatus;
  estimated_ready_at?: string | null;
  note?: string | null;
}

export interface NewOrderPayload {
  order_id: string;
  seller_id: string;
}

type SocketLike = {
  on: (event: string, fn: (...args: any[]) => void) => void;
  off: (event: string, fn?: (...args: any[]) => void) => void;
  emit: (event: string, ...args: any[]) => void;
  connected: boolean;
  disconnect: () => void;
};

let socket: SocketLike | null = null;

async function ensureClient(token: string): Promise<SocketLike> {
  if (socket) return socket;
  // Lazy import keeps the dep out of cold start for users who never log in.
  const { io } = await import('socket.io-client');
  // Strip the trailing /api/v1 so we connect to the bare host.
  const wsUrl = API_URL.replace(/\/api\/v1\/?$/, '');
  socket = io(wsUrl, {
    transports: ['websocket'],
    auth: { token: `Bearer ${token}` },
  }) as unknown as SocketLike;
  return socket;
}

export const socketService = {
  async connect(token: string): Promise<void> {
    await ensureClient(token);
  },

  disconnect(): void {
    socket?.disconnect();
    socket = null;
  },

  joinOrder(orderId: string): void {
    socket?.emit('join_order', { order_id: orderId });
  },

  leaveOrder(orderId: string): void {
    socket?.emit('leave_order', { order_id: orderId });
  },

  onOrderStatusChanged(handler: Listener<OrderStatusChangedPayload>): () => void {
    socket?.on('order:status_changed', handler);
    return () => socket?.off('order:status_changed', handler);
  },

  /** Seller-only — fired when a new order is placed against this seller. */
  onNewOrder(handler: Listener<NewOrderPayload>): () => void {
    socket?.on('order:placed', handler);
    return () => socket?.off('order:placed', handler);
  },

  isConnected(): boolean {
    return socket?.connected ?? false;
  },
};
