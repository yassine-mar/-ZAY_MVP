import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useIdleLogout } from '@/hooks/useIdleLogout';

/**
 * App shell — sidebar + topbar + page content via <Outlet/>.
 * Mounted at the root of every authenticated route (see routes/index.tsx).
 * Idle-logout is armed here so it covers every authenticated screen.
 */
export function AppLayout() {
  useIdleLogout();
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
