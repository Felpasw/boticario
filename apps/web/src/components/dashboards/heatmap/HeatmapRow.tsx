import { cn } from '@/lib/utils';

import { HOURS } from './constants';
import { intensityClass } from './intensity';

interface HeatmapRowProps {
  label: string;
  weekday: number;
  max: number;
  lookup: Map<string, number>;
}

export function HeatmapRow({ label, weekday, max, lookup }: HeatmapRowProps) {
  return (
    <>
      <span className="pr-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {HOURS.map((hour) => {
        const value = lookup.get(`${weekday}:${hour}`) ?? 0;
        return (
          <div
            key={hour}
            title={`${label} ${hour}h · ${value} visitas`}
            className={cn('h-6 w-6 rounded-sm', intensityClass(value, max))}
          />
        );
      })}
    </>
  );
}
