'use client';

import { motion } from 'motion/react';

import { cn } from '@/lib/utils';
import { fadeUpItemVariants, staggeredContainerVariants } from '@/lib/motionVariants';

import type { RecurringDevice } from './mock';

interface TopRecurringListProps {
  devices: RecurringDevice[];
  className?: string;
}

export function TopRecurringList({ devices, className }: TopRecurringListProps) {
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
            <span className="font-mono text-sm text-foreground">{device.deviceId}</span>
          </div>
          <div className="flex items-center gap-6 text-right">
            <span className="text-xs text-muted-foreground">
              dwell <span className="font-medium text-foreground">{device.avgDwell}</span>
            </span>
            <span className="text-xs text-muted-foreground">
              último <span className="font-medium text-foreground">{device.lastSeenRelative}</span>
            </span>
            <span className="min-w-[3rem] text-right text-sm font-semibold text-foreground">
              {device.visits} <span className="text-xs font-normal text-muted-foreground">x</span>
            </span>
          </div>
        </motion.li>
      ))}
    </motion.ul>
  );
}
