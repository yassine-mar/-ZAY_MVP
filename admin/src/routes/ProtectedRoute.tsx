import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { PATHS } from './paths';
import type { ReactNode } from 'react';

/**
 * Gates every authenticated route. If the in-memory token is gone (refresh,
 * idle-timeout, manual reset), the admin is sent to /login. The intended
 * destination is preserved in router state so we can return after re-login.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={PATHS.LOGIN} state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
