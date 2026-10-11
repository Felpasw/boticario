'use client';

import { motion } from 'motion/react';
import type { DwellDistributionResponse } from 'shared';

import { Skeleton } from '@/components/atoms/Skeleton';
import { cn } from '@/lib/utils';

interface DwellDistributionChartProps {
  distribution: DwellDistributionResponse | undefined;
  className?: string;
}

const SKELETON_BUCKETS = 5;

export function DwellDistributionChart({ distribution, className }: DwellDistributionChartProps) {
  if (!distribution) {
    return (
      <div className={cn('flex flex-col gap-3', className)}>
        {Array.from({ length: SKELETON_BUCKETS }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 flex-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    );
  }

  const { buckets, totalWithDwell } = distribution;
  const max = buckets.reduce((acc, b) => (b.count > acc ? b.count : acc), 0);

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {buckets.map((bucket, i) => {
        const pct = totalWithDwell === 0 ? 0 : (bucket.count / totalWithDwell) * 100;
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
              {bucket.count} <span className="text-muted-foreground">({pct.toFixed(0)}%)</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
