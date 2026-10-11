'use client';

import { motion } from 'motion/react';
import type { TopRecurringResponse } from 'shared';

import { Skeleton } from '@/components/atoms/Skeleton';
import { cn } from '@/lib/utils';
import { fadeUpItemVariants, staggeredContainerVariants } from '@/lib/motionVariants';
import {
  formatDeviceId,
  formatMinutes,
  formatRelativeTime,
} from '@/utils/formatters';

interface TopRecurringListProps {
  devices: TopRecurringResponse['data'] | undefined;
  className?: string;
}

const SKELETON_ROWS = 5;

export function TopRecurringList({ devices, className }: TopRecurringListProps) {
  if (!devices) {
    return (
      <ul className={cn('divide-y divide-border/50 rounded-lg border border-border/50', className)}>
        {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
          <li key={i} className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-3 w-6" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex items-center gap-6">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-10" />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (devices.length === 0) {
    return (
      <div
        className={cn(
          'rounded-lg border border-dashed border-border/60 px-4 py-6 text-sm text-muted-foreground',
          className,
        )}
      >
        Nenhum dispositivo recorrente no período.
      </div>
    );
  }

  return (
    <motion.ul
      className={cn('divide-y divide-border/50 rounded-lg border border-border/50', className)}
      variants={staggeredContainerVariants}
      initial="hidden"
      animate="visible"
    >
      {devices.map((device, i) => (
        <motion.li
          key={device.deviceId}
          variants={fadeUpItemVariants}
          className="flex items-center justify-between gap-4 px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <span className="w-6 text-right font-mono text-xs text-muted-foreground">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="font-mono text-sm text-foreground">
              {formatDeviceId(device.deviceId)}
            </span>
          </div>
          <div className="flex items-center gap-6 text-right">
            <span className="text-xs text-muted-foreground">
              dwell{' '}
              <span className="font-medium text-foreground">
                {formatMinutes(device.avgDwellSeconds)}
              </span>
            </span>
            <span className="text-xs text-muted-foreground">
              último{' '}
              <span className="font-medium text-foreground">
                {formatRelativeTime(device.lastSeenAt)}
              </span>
            </span>
            <span className="min-w-[3rem] text-right text-sm font-semibold text-foreground">
              {device.visitCount}{' '}
              <span className="text-xs font-normal text-muted-foreground">x</span>
            </span>
          </div>
        </motion.li>
      ))}
    </motion.ul>
  );
}
