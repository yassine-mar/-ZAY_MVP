import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { asyncStorage } from '@/services/asyncStorage.service';
import type { CartLine } from '@/types/domain.types';

interface CartState {
  items: CartLine[];
  seller_id: string | null;
  seller_name: string | null;

  /** True when items.length > 0. */
  hasItems: () => boolean;
  /** Sum of quantity across lines — used by the cart badge. */
  itemCount: () => number;
  /** Snapshot subtotal in MAD (server is the source of truth on submit). */
  subtotal: () => number;

  /** Internal add; the screen layer guards the cross-seller confirm. */
  _add: (line: CartLine, seller: { id: string; name: string }) => void;
  updateQuantity: (menu_item_id: string, qty: number) => void;
  removeItem: (menu_item_id: string) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      seller_id: null,
      seller_name: null,

      hasItems: () => get().items.length > 0,
      itemCount: () => get().items.reduce((sum, l) => sum + l.quantity, 0),
      subtotal: () => get().items.reduce((sum, l) => sum + l.quantity * l.price, 0),

      _add: (line, seller) => {
        const { items, seller_id } = get();
        // Same-seller merge: if the item is already in cart, bump quantity.
        if (seller_id === seller.id) {
          const existing = items.find((l) => l.menu_item_id === line.menu_item_id);
          if (existing) {
            set({
              items: items.map((l) =>
                l.menu_item_id === line.menu_item_id
                  ? { ...l, quantity: l.quantity + line.quantity }
                  : l,
              ),
            });
            return;
          }
          set({ items: [...items, line] });
          return;
        }

        // Different seller (or empty cart): replace.
        set({ items: [line], seller_id: seller.id, seller_name: seller.name });
      },

      updateQuantity: (menu_item_id, qty) => {
        if (qty <= 0) {
          get().removeItem(menu_item_id);
          return;
        }
        set({
          items: get().items.map((l) =>
            l.menu_item_id === menu_item_id ? { ...l, quantity: qty } : l,
          ),
        });
      },

      removeItem: (menu_item_id) => {
        const next = get().items.filter((l) => l.menu_item_id !== menu_item_id);
        // Clearing the last line resets the seller binding too.
        if (next.length === 0) {
          set({ items: [], seller_id: null, seller_name: null });
        } else {
          set({ items: next });
        }
      },

      clear: () => set({ items: [], seller_id: null, seller_name: null }),
    }),
    {
      name: '@zay/cart',
      version: 1,
      storage: createJSONStorage(() => asyncStorage),
      // Don't persist methods or derived selectors — only the actual state.
      partialize: (s) => ({
        items: s.items,
        seller_id: s.seller_id,
        seller_name: s.seller_name,
      }),
    },
  ),
);
