import Link from 'next/link';
import type { ReactNode } from 'react';

import { LogoutButton } from '@/components/atoms/LogoutButton';
import { AnimatedThemeToggle } from '@/components/ui/animatedThemeToggle';
import { BoticarioLogo } from '@/components/ui/BoticarioLogo';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      <header className="sticky top-0 z-10 border-b border-zinc-200/80 bg-white/80 backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-950/80">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" aria-label="Ir ao painel" className="inline-flex items-center">
            <BoticarioLogo width={120} height={48} />
          </Link>
          <nav className="flex items-center gap-2">
            <AnimatedThemeToggle />
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-10">{children}</main>
    </div>
  );
}
