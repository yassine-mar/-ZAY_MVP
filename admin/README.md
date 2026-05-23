# @ZAY Admin Dashboard

React + Vite + TypeScript admin dashboard for the @ZAY platform.

## Tech stack

- **Build:** Vite 5
- **Language:** TypeScript (strict)
- **Framework:** React 18
- **Routing:** React Router 6 (`createBrowserRouter`)
- **Server state:** TanStack Query v5
- **Client state:** Zustand (auth, UI)
- **HTTP:** axios with interceptors
- **Forms:** React Hook Form + Zod
- **Tables:** TanStack Table v8 (headless)
- **Charts:** Recharts
- **UI:** shadcn/ui + Tailwind CSS
- **Icons:** lucide-react
- **Notifications:** sonner

## Quick start

```bash
cp .env.example .env
# Edit .env to point at your backend

npm install
npm run dev
# → http://localhost:5173
```

## Project layout

```
admin/src/
├── api/         axios client + per-resource modules
├── components/
│   ├── ui/      shadcn primitives (Button, Input, ...)
│   ├── layout/  Sidebar, Topbar, AppLayout
│   ├── tables/  DataTable + toolbar + pagination
│   ├── charts/  MetricCard + chart wrappers
│   ├── feedback/  ErrorBoundary, LoadingPage
│   └── domain/  Status badges, ConfirmDialog
├── pages/       Page components keyed by resource
├── routes/      Router config + ProtectedRoute
├── store/       Zustand stores (auth, ui)
├── hooks/       useAuth, useTableUrlState, useDebounce
├── lib/         utils + queryClient
├── utils/       format, error parsing
├── constants/   API constants, status colors
└── types/       Shared TypeScript types
```

## Security notes

- **Token is held in memory only** (Zustand store, not localStorage). Page refresh forces re-login. This is deliberate — admin tools that can suspend users and cancel orders should never expose tokens to XSS.
- **30-minute idle timeout** auto-logs admins out (via `useIdleLogout`).
- **CORS-protected**: backend whitelists this app's origin only.

## Adding shadcn primitives

The primitives shipped in this scaffold (Button, Input, Card, Badge, Skeleton, Label, Table) are the common ones. For anything else:

```bash
npx shadcn-ui@latest add dialog dropdown-menu select tabs tooltip
```

See `components.json` for shadcn config.

## Scripts

```bash
npm run dev          # Vite dev server with HMR
npm run build        # Type-check + production build → dist/
npm run preview      # Preview the production build locally
npm run type-check   # tsc --noEmit (no build)
npm run lint         # ESLint
```
