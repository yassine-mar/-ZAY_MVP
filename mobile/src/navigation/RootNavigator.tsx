import { useAuth } from '@/hooks/useAuth';
import { AuthStack } from './AuthStack';
import { SplashScreen } from '@/screens/shared/SplashScreen';
import { AuthenticatedPlaceholder } from '@/screens/AuthenticatedPlaceholder';

/**
 * Top-level branching by auth state.
 *
 * Per the architecture: protected routes use *conditional navigators*,
 * not per-screen HOCs. A logged-out user literally cannot navigate to
 * an authenticated screen — that screen isn't mounted in the tree.
 *
 * When CustomerTabs / SellerTabs / PendingSellerStack ship, this is the
 * one place to extend the branching.
 */
export function RootNavigator() {
  const { isHydrated, isAuthenticated } = useAuth();

  if (!isHydrated)      return <SplashScreen />;
  if (!isAuthenticated) return <AuthStack />;

  // TODO(post-auth): branch on user.role + seller_profile.status
  return <AuthenticatedPlaceholder />;
}
