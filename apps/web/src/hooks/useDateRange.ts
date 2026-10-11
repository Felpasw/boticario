'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import { addDays, startOfDay, subDays } from 'date-fns';

const DEFAULT_DAYS = 30;

export interface UseDateRangeResult {
  from: string;
  to: string;
  shortcut: '7d' | '30d' | '90d' | 'custom';
  setPeriod(args: { from: Date; to: Date }): void;
  setShortcut(shortcut: '7d' | '30d' | '90d'): void;
}

const SHORTCUT_DAYS: Record<'7d' | '30d' | '90d', number> = { '7d': 7, '30d': 30, '90d': 90 };

export function useDateRange(): UseDateRangeResult {
  const router = useRouter();
  const searchParams = useSearchParams();

  // defaults stable across renders — avoid re-creating `new Date()` on every render,
  // which would churn the derived `from`/`to` and spin dependent queries forever.
  const defaults = useMemo(() => {
    const to = new Date().toISOString();
    const from = subDays(new Date(to), DEFAULT_DAYS).toISOString();
    return { from, to };
  }, []);

  const to = searchParams.get('to') ?? defaults.to;
  const from = searchParams.get('from') ?? defaults.from;
  const shortcutParam = searchParams.get('shortcut') as UseDateRangeResult['shortcut'] | null;
  const shortcut: UseDateRangeResult['shortcut'] = shortcutParam ?? '30d';

  const setPeriod = useCallback(
    ({ from: nextFrom, to: nextTo }: { from: Date; to: Date }) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('from', startOfDay(nextFrom).toISOString());
      params.set('to', addDays(startOfDay(nextTo), 1).toISOString());
      params.set('shortcut', 'custom');
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const setShortcut = useCallback(
    (nextShortcut: '7d' | '30d' | '90d') => {
      const days = SHORTCUT_DAYS[nextShortcut];
      const now = new Date();
      const params = new URLSearchParams(searchParams.toString());
      params.set('from', subDays(now, days).toISOString());
      params.set('to', now.toISOString());
      params.set('shortcut', nextShortcut);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  return { from, to, shortcut, setPeriod, setShortcut };
}
