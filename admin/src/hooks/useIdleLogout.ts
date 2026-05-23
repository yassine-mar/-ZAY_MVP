import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth.store';
import { IDLE_TIMEOUT_MS } from '@/constants/api';
import { PATHS } from '@/routes/paths';

/**
 * Mounts a sliding-window idle timer on every meaningful interaction.
 * After IDLE_TIMEOUT_MS without activity, the admin is logged out and
 * sent to /login with a toast explaining why.
 *
 * Activity events watched: mousemove, keydown, click, scroll, touchstart.
 */
export function useIdleLogout() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const reset = useAuthStore((s) => s.reset);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    const onTimeout = () => {
      reset();
      toast.info('You were signed out after 30 minutes of inactivity.');
      navigate(PATHS.LOGIN, { replace: true });
    };

    const armTimer = () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(onTimeout, IDLE_TIMEOUT_MS);
    };

    const events: Array<keyof WindowEventMap> = [
      'mousemove', 'keydown', 'click', 'scroll', 'touchstart',
    ];

    armTimer();
    events.forEach((evt) => window.addEventListener(evt, armTimer, { passive: true }));

    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      events.forEach((evt) => window.removeEventListener(evt, armTimer));
    };
  }, [isAuthenticated, navigate, reset]);
}
