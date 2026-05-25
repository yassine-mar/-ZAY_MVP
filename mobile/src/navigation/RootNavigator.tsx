import { useAuth } from '@/hooks/useAuth';
import { AuthStack } from './AuthStack';
import { CustomerRoot } from './CustomerRoot';
import { SellerRoot } from './SellerRoot';
import { PendingSellerStack } from './PendingSellerStack';
import { SplashScreen } from '@/screens/shared/SplashScreen';
import { RejectedScreen } from '@/screens/seller/RejectedScreen';
import { SuspendedScreen } from '@/screens/seller/SuspendedScreen';

/**
 * Top-level branching by auth state.
 *
 * Per the architecture: protected routes use *conditional navigators*,
 * not per-screen HOCs. A logged-out user literally cannot navigate to
 * an authenticated screen — that screen isn't mounted in the tree.
 *
 * When the auth store updates (login, logout, profile refresh, seller
 * approval), this re-renders into the right branch automatically.
 */
export function RootNavigator() {
  const { isHydrated, isAuthenticated, user } = useAuth();

  if (!isHydrated)      return <SplashScreen />;
  if (!isAuthenticated) return <AuthStack />;

  // Account-level suspension trumps role-specific routing.
  if (user?.status === 'suspended') return <SuspendedScreen />;

  if (user?.role === 'customer') return <CustomerRoot />;

  if (user?.role === 'seller') {
    const status = user.seller_profile?.status;
    if (status === 'approved')  return <SellerRoot />;
    if (status === 'rejected')  return <RejectedScreen />;
    if (status === 'suspended') return <SuspendedScreen />;
    /* pending */              return <PendingSellerStack />;
  }

  return <AuthStack />;
}
