'use client';

import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { motion } from 'motion/react';
import type { SummaryResponse } from 'shared';

import { Skeleton } from '@/components/atoms/Skeleton';
import { cn } from '@/lib/utils';
import { fadeUpItemVariants, staggeredContainerVariants } from '@/lib/motionVariants';
import { formatNumber, formatPercent } from '@/utils/formatters';

interface KpiCardsProps {
  summary: SummaryResponse | undefined;
  className?: string;
}

const DIRECTION_ICON = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  flat: Minus,
} as const;

const DIRECTION_COLOR = {
  up: 'text-emerald-600 dark:text-emerald-400',
  down: 'text-rose-600 dark:text-rose-400',
  flat: 'text-muted-foreground',
} as const;

interface CardSpec {
  key: 'visits' | 'uniqueVisitors' | 'recurringRate' | 'dwellMedianSeconds';
  label: string;
  format: (value: number) => string;
}

const CARDS: CardSpec[] = [
  { key: 'visits', label: 'Visitas', format: formatNumber },
  { key: 'uniqueVisitors', label: 'Visitantes únicos', format: formatNumber },
  { key: 'recurringRate', label: 'Taxa de recorrência', format: formatPercent },
  { key: 'dwellMedianSeconds', label: 'Dwell mediano', format: (v) => `${Math.round(v / 60)}min` },
];

export function KpiCards({ summary, className }: KpiCardsProps) {
  return (
    <motion.div
      className={cn('grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4', className)}
      variants={staggeredContainerVariants}
      initial="hidden"
      animate="visible"
      role="list"
      aria-label="Métricas da loja"
      data-loading={summary ? undefined : true}
    >
      {CARDS.map((card) => {
        const block = summary?.kpis[card.key];
        const direction = block?.variation.direction ?? 'flat';
        const Icon = DIRECTION_ICON[direction];
        const colorClass = DIRECTION_COLOR[direction];
        return (
          <motion.div
            key={card.key}
            role="listitem"
            variants={fadeUpItemVariants}
            className="rounded-lg border border-border/50 bg-background p-4"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
              {card.label}
            </p>
            {block ? (
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {card.format(block.value)}
              </p>
            ) : (
              <Skeleton className="mt-2 h-8 w-24" />
            )}
            <div className="mt-2 flex items-center justify-between gap-2">
              <span />
              {block ? (
                <span
                  className={cn('flex items-center gap-0.5 text-xs font-semibold', colorClass)}
                >
                  <Icon className="size-3" aria-hidden="true" />
                  {Math.abs(block.variation.pct).toFixed(1)}%
                </span>
              ) : (
                <Skeleton className="h-3 w-10" />
              )}
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
