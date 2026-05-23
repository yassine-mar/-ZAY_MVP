import { UserMenu } from './UserMenu';

export function Topbar() {
  return (
    <header className="flex h-14 items-center justify-end border-b bg-card px-6">
      <UserMenu />
    </header>
  );
}
