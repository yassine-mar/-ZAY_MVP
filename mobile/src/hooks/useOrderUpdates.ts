import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { socketService } from '@/services/socket.service';
import type { Order, OrderStatusEntry } from '@/types/domain.types';

/**
 * Subscribe to real-time status updates for a single order.
 *
 * Mounts a socket room subscription; unmounts cleanly. Status changes
 * are written directly into the React Query cache so the screen rebuilds
 * with the new value — no manual re-fetch needed.
 *
 * Falls back gracefully: if the socket isn't connected yet, the next
 * polling refetch from React Query closes the gap.
 */
export function useOrderUpdates(orderId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!orderId) return;

    socketService.joinOrder(orderId);

    const unsubscribe = socketService.onOrderStatusChanged((payload) => {
      if (payload.order_id !== orderId) return;

      qc.setQueryData<{ order: Order; history: OrderStatusEntry[] }>(
        ['order', orderId],
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            order: {
              ...prev.order,
              status: payload.status,
              estimated_ready_at:
                payload.estimated_ready_at ?? prev.order.estimated_ready_at,
            },
          };
        },
      );

      // Background-refresh history so the new timeline entry shows up too.
      qc.invalidateQueries({ queryKey: ['order', orderId] });
    });

    return () => {
      socketService.leaveOrder(orderId);
      unsubscribe();
    };
  }, [orderId, qc]);
}
