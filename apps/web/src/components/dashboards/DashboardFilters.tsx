'use client';

import type { DateRange } from 'react-day-picker';

import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { cn } from '@/lib/utils';
import { useDateRange } from '@/hooks/useDateRange';

const SHORTCUTS: Array<{ key: '7d' | '30d' | '90d'; label: string }> = [
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: '90d', label: '90 dias' },
];

export function DashboardFilters() {
  const { from, to, shortcut, setPeriod, setShortcut } = useDateRange();

  const range: DateRange = { from: new Date(from), to: new Date(to) };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-xs">
        <DateRangeFilter
          value={range}
          onValueChange={(value) => {
            if (value?.from && value.to) setPeriod({ from: value.from, to: value.to });
          }}
          label="Período"
          ariaLabel="Filtrar métricas por período"
        />
      </div>
      <div className="flex gap-2" role="group" aria-label="Períodos rápidos">
        {SHORTCUTS.map((item) => (
          <button
            key={item.key}
            type="button"
            data-active={shortcut === item.key ? true : undefined}
            onClick={() => setShortcut(item.key)}
            className={cn(
              'rounded-md border border-border/50 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors',
              'hover:bg-muted/60 hover:text-foreground',
              'data-[active=true]:border-foreground data-[active=true]:bg-foreground data-[active=true]:text-background',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
