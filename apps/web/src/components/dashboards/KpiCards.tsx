'use client';

import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { motion } from 'motion/react';

import { cn } from '@/lib/utils';
import { fadeUpItemVariants, staggeredContainerVariants } from '@/lib/motionVariants';

import type { KpiCard } from './mock';

interface KpiCardsProps {
  cards: KpiCard[];
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

export function KpiCards({ cards, className }: KpiCardsProps) {
  return (
    <motion.div
      className={cn('grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4', className)}
      variants={staggeredContainerVariants}
      initial="hidden"
      animate="visible"
      role="list"
      aria-label="Métricas da loja"
    >
      {cards.map((card) => {
        const Icon = card.variation ? DIRECTION_ICON[card.variation.direction] : null;
        const colorClass = card.variation ? DIRECTION_COLOR[card.variation.direction] : null;
        return (
          <motion.div
            key={card.label}
            role="listitem"
            variants={fadeUpItemVariants}
            className="rounded-lg border border-border/50 bg-background p-4"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{card.value}</p>
            <div className="mt-2 flex items-center justify-between gap-2">
              {card.hint ? (
                <p className="text-xs text-muted-foreground/70">{card.hint}</p>
              ) : (
                <span />
              )}
              {card.variation && Icon ? (
                <span className={cn('flex items-center gap-0.5 text-xs font-semibold', colorClass)}>
                  <Icon className="size-3" aria-hidden="true" />
                  {Math.abs(card.variation.pct).toFixed(1)}%
                </span>
              ) : null}
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
