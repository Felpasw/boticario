'use client';

import type { TimeseriesResponse } from 'shared';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Skeleton } from '@/components/atoms/Skeleton';
import { cn } from '@/lib/utils';
import { formatShortDate } from '@/utils/formatters';

import { chartTooltipStyles } from './chartTooltipStyles';

interface VisitsPerDayChartProps {
  series: TimeseriesResponse['series'] | undefined;
  className?: string;
}

export function VisitsPerDayChart({ series, className }: VisitsPerDayChartProps) {
  if (!series) {
    return <Skeleton className={cn('h-64 w-full', className)} />;
  }

  return (
    <div className={cn('h-64 w-full', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
          <XAxis
            dataKey="bucket"
            stroke="currentColor"
            fontSize={10}
            tickFormatter={formatShortDate}
          />
          <YAxis stroke="currentColor" fontSize={10} allowDecimals={false} />
          <Tooltip
            cursor={{ strokeOpacity: 0.2 }}
            contentStyle={chartTooltipStyles.content}
            labelStyle={chartTooltipStyles.label}
            itemStyle={chartTooltipStyles.item}
            labelFormatter={(label) => formatShortDate(String(label))}
          />
          <Legend
            iconSize={8}
            wrapperStyle={{ fontSize: 11, color: 'currentColor', paddingTop: 4 }}
          />
          <Line
            name="Total"
            type="monotone"
            dataKey="visits"
            stroke="currentColor"
            strokeWidth={2}
            dot={{ r: 2 }}
            activeDot={{ r: 5 }}
          />
          <Line
            name="Recorrentes"
            type="monotone"
            dataKey="recurringVisitors"
            stroke="currentColor"
            strokeOpacity={0.4}
            strokeDasharray="4 4"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
