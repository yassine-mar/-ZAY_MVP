import { useAuth } from '@/hooks/useAuth';
import { AuthStack } from './AuthStack';
import { CustomerRoot } from './CustomerRoot';
import { SplashScreen } from '@/screens/shared/SplashScreen';
import { AuthenticatedPlaceholder } from '@/screens/AuthenticatedPlaceholder';

/**
 * Top-level branching by auth state.
 *
 * Per the architecture: protected routes use *conditional navigators*,
 * not per-screen HOCs. A logged-out user literally cannot navigate to
 * an authenticated screen — that screen isn't mounted in the tree.
 *
 * Seller (and pending/rejected) branches land in a later slice.
 */
export function RootNavigator() {
  const { isHydrated, isAuthenticated, user } = useAuth();

  if (!isHydrated)      return <SplashScreen />;
  if (!isAuthenticated) return <AuthStack />;

  if (user?.role === 'customer') return <CustomerRoot />;

  // TODO(seller-tree): branch on seller_profile.status
  return <AuthenticatedPlaceholder />;
}
