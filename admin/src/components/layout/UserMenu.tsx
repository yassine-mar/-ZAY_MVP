import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { PATHS } from '@/routes/paths';

export function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const handleLogout = () => {
    qc.clear();
    logout();
    navigate(PATHS.LOGIN, { replace: true });
  };

  if (!user) return null;

  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <p className="text-sm font-medium leading-tight">{user.name}</p>
        <p className="text-xs leading-tight text-muted-foreground">{user.email}</p>
      </div>
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
        {user.name.charAt(0).toUpperCase()}
      </div>
      <Button variant="ghost" size="icon" aria-label="Log out" onClick={handleLogout}>
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
