import Link from 'next/link';
import type { ReactNode } from 'react';

import { LogoutButton } from '@/components/atoms/LogoutButton';
import { AnimatedThemeToggle } from '@/components/ui/animatedThemeToggle';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      <header className="sticky top-0 z-10 border-b border-zinc-200/80 bg-white/80 backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-950/80">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link
            href="/dashboard"
            className="text-sm font-black uppercase tracking-[0.3em] text-zinc-900 dark:text-zinc-50"
          >
            Boticario
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
