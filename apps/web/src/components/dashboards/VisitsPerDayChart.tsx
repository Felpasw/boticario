'use client';

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

import { cn } from '@/lib/utils';

import { chartTooltipStyles } from './chartTooltipStyles';
import type { VisitsPerDayEntry } from './mock';

interface VisitsPerDayChartProps {
  data: VisitsPerDayEntry[];
  className?: string;
}

export function VisitsPerDayChart({ data, className }: VisitsPerDayChartProps) {
  return (
    <div className={cn('h-64 w-full', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
          <XAxis dataKey="day" stroke="currentColor" fontSize={10} />
          <YAxis stroke="currentColor" fontSize={10} allowDecimals={false} />
          <Tooltip
            cursor={{ strokeOpacity: 0.2 }}
            contentStyle={chartTooltipStyles.content}
            labelStyle={chartTooltipStyles.label}
            itemStyle={chartTooltipStyles.item}
          />
          <Legend
            iconSize={8}
            wrapperStyle={{ fontSize: 11, color: 'currentColor', paddingTop: 4 }}
          />
          <Line
            name="Total"
            type="monotone"
            dataKey="total"
            stroke="currentColor"
            strokeWidth={2}
            dot={{ r: 2 }}
            activeDot={{ r: 5 }}
          />
          <Line
            name="Recorrentes"
            type="monotone"
            dataKey="recurring"
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
