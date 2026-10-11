'use client';

import type { HeatmapResponse } from 'shared';

import { Skeleton } from '@/components/atoms/Skeleton';
import { cn } from '@/lib/utils';

import { HOURS, WEEKDAYS } from './heatmap/constants';
import { HeatmapRow } from './heatmap/HeatmapRow';

interface WeekdayHourHeatmapProps {
  matrix: HeatmapResponse['matrix'] | undefined;
  className?: string;
}

export function WeekdayHourHeatmap({ matrix, className }: WeekdayHourHeatmapProps) {
  if (!matrix) {
    return (
      <div className={cn('w-full overflow-x-auto', className)}>
        <div
          className="inline-grid gap-1"
          style={{ gridTemplateColumns: `auto repeat(${HOURS.length}, minmax(0, 1fr))` }}
        >
          <span />
          {HOURS.map((hour) => (
            <span key={hour} className="w-6" />
          ))}
          {WEEKDAYS.map((label) => (
            <HeatmapSkeletonRow key={label} />
          ))}
        </div>
      </div>
    );
  }

  const max = matrix.reduce((acc, c) => (c.count > acc ? c.count : acc), 0);
  const lookup = new Map(matrix.map((c) => [`${c.weekday}:${c.hour}`, c.count]));

  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <div
        className="inline-grid gap-1 text-[10px] text-muted-foreground"
        style={{ gridTemplateColumns: `auto repeat(${HOURS.length}, minmax(0, 1fr))` }}
      >
        <span />
        {HOURS.map((hour) => (
          <span key={hour} className="w-6 text-center font-mono">
            {hour}
          </span>
        ))}
        {WEEKDAYS.map((label, weekday) => (
          <HeatmapRow key={label} label={label} weekday={weekday} max={max} lookup={lookup} />
        ))}
      </div>
    </div>
  );
}

function HeatmapSkeletonRow() {
  return (
    <>
      <Skeleton className="mr-2 h-3 w-8" />
      {HOURS.map((hour) => (
        <Skeleton key={hour} className="h-6 w-6 rounded-sm" />
      ))}
    </>
  );
}
