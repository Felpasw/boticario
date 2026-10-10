'use client';

import { useState } from 'react';
import type { DateRange } from 'react-day-picker';

import { DateRangeFilter } from '@/components/ui/DateRangeFilter';

const INITIAL_RANGE: DateRange = {
  from: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000),
  to: new Date(),
};

export function DashboardFilters() {
  const [range, setRange] = useState<DateRange | undefined>(INITIAL_RANGE);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-xs">
        <DateRangeFilter
          value={range}
          onValueChange={setRange}
          label="Período"
          ariaLabel="Filtrar KPIs por período"
        />
      </div>
    </div>
  );
}
