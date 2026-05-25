import { useEffect } from 'react';
import Toast from 'react-native-toast-message';
import { useQueryClient } from '@tanstack/react-query';
import { socketService } from '@/services/socket.service';

/**
 * Global seller-side socket listener.
 *
 * Mounted once at SellerRoot — runs for the lifetime of the seller session.
 * On every `order:placed` event:
 *   - invalidate the seller orders list (any open IncomingOrders screen
 *     rebuilds with the new entry at the top)
 *   - surface a toast so a backgrounded screen still flags the event
 *
 * Push notifications (FCM) are the source of truth when the app is fully
 * backgrounded; this hook covers the foreground experience.
 */
export function useSellerOrderEvents() {
  const qc = useQueryClient();

  useEffect(() => {
    const off = socketService.onNewOrder(() => {
      qc.invalidateQueries({ queryKey: ['seller', 'orders'] });
      qc.invalidateQueries({ queryKey: ['seller', 'analytics'] });

      Toast.show({
        type: 'success',
        text1: 'New order!',
        text2: 'Tap Orders to review and accept.',
        visibilityTime: 4000,
      });
    });
    return off;
  }, [qc]);
}
