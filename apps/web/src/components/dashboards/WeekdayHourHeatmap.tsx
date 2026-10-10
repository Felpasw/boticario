'use client';

import { cn } from '@/lib/utils';

interface WeekdayHourHeatmapProps {
  matrix: number[][];
  weekdays: string[];
  hours: number[];
  className?: string;
}

function intensity(value: number, max: number): string {
  if (max === 0) return 'bg-zinc-100 dark:bg-zinc-900';
  const ratio = value / max;
  if (ratio < 0.15) return 'bg-zinc-100 dark:bg-zinc-900';
  if (ratio < 0.3) return 'bg-zinc-200 dark:bg-zinc-800';
  if (ratio < 0.5) return 'bg-zinc-400 dark:bg-zinc-600';
  if (ratio < 0.75) return 'bg-zinc-600 dark:bg-zinc-400';
  return 'bg-zinc-900 dark:bg-zinc-100';
}

export function WeekdayHourHeatmap({ matrix, weekdays, hours, className }: WeekdayHourHeatmapProps) {
  const max = Math.max(...matrix.flat());
  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <div className="inline-grid grid-flow-col auto-cols-min gap-y-1">
        <div
          className="grid grid-cols-[auto_repeat(var(--hour-count),minmax(0,1fr))] gap-1 text-[10px] text-muted-foreground"
          style={{ ['--hour-count' as string]: hours.length }}
        >
          <span />
          {hours.map((hour) => (
            <span key={hour} className="w-6 text-center font-mono">
              {hour}
            </span>
          ))}
          {matrix.map((row, weekdayIndex) => (
            <HeatmapRow
              key={weekdays[weekdayIndex]}
              label={weekdays[weekdayIndex] ?? ''}
              row={row}
              max={max}
              hours={hours}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface HeatmapRowProps {
  label: string;
  row: number[];
  max: number;
  hours: number[];
}

function HeatmapRow({ label, row, max, hours }: HeatmapRowProps) {
  return (
    <>
      <span className="pr-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {row.map((value, hourIndex) => (
        <div
          key={hourIndex}
          title={`${label} ${hours[hourIndex]}h · ${value} visitas`}
          className={cn('h-6 w-6 rounded-sm', intensity(value, max))}
        />
      ))}
    </>
  );
}
