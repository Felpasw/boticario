'use client';

import { motion } from 'motion/react';

import { cn } from '@/lib/utils';

import type { DwellBucket } from './mock';

interface DwellDistributionChartProps {
  buckets: DwellBucket[];
  className?: string;
}

export function DwellDistributionChart({ buckets, className }: DwellDistributionChartProps) {
  const total = buckets.reduce((sum, b) => sum + b.count, 0);
  const max = Math.max(...buckets.map((b) => b.count));

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {buckets.map((bucket, i) => {
        const pct = total === 0 ? 0 : (bucket.count / total) * 100;
        const widthPct = max === 0 ? 0 : (bucket.count / max) * 100;
        return (
          <div key={bucket.label} className="flex items-center gap-3">
            <span className="w-16 text-xs font-medium text-muted-foreground">{bucket.label}</span>
            <div className="relative flex-1 overflow-hidden rounded-sm bg-muted/60">
              <motion.div
                className="h-5 rounded-sm bg-zinc-900 dark:bg-zinc-100"
                initial={{ width: 0 }}
                animate={{ width: `${widthPct}%` }}
                transition={{ duration: 0.6, delay: i * 0.05, ease: 'easeOut' }}
              />
            </div>
            <span className="w-20 text-right text-xs tabular-nums text-foreground">
              {bucket.count}{' '}
              <span className="text-muted-foreground">({pct.toFixed(0)}%)</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
