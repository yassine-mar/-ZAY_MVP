import { Alert } from 'react-native';
import { useCartStore } from '@/store/cart.store';
import type { CartLine } from '@/types/domain.types';

/**
 * Cart hook with the cross-seller guard baked in.
 *   - Same seller / empty cart: add silently.
 *   - Different seller: confirm via native Alert before replacing.
 */
export function useCart() {
  const state = useCartStore();

  const addItem = (
    line: CartLine,
    seller: { id: string; name: string },
  ): Promise<boolean> =>
    new Promise((resolve) => {
      const currentSeller = state.seller_id;
      if (!currentSeller || currentSeller === seller.id) {
        state._add(line, seller);
        resolve(true);
        return;
      }

      Alert.alert(
        'Clear cart?',
        `Your cart has items from ${state.seller_name}. Adding this will replace them with items from ${seller.name}.`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          {
            text: 'Replace',
            style: 'destructive',
            onPress: () => {
              state._add(line, seller);
              resolve(true);
            },
          },
        ],
      );
    });

  return {
    items: state.items,
    sellerId: state.seller_id,
    sellerName: state.seller_name,
    itemCount: state.itemCount(),
    subtotal: state.subtotal(),
    hasItems: state.hasItems(),

    addItem,
    updateQuantity: state.updateQuantity,
    removeItem: state.removeItem,
    clear: state.clear,
  };
}
