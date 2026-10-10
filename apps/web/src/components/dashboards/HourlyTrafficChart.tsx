'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { cn } from '@/lib/utils';

import { chartTooltipStyles } from './chartTooltipStyles';
import type { HourlyBucket } from './mock';

interface HourlyTrafficChartProps {
  data: HourlyBucket[];
  className?: string;
}

export function HourlyTrafficChart({ data, className }: HourlyTrafficChartProps) {
  return (
    <div className={cn('h-64 w-full', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
          <XAxis dataKey="hour" stroke="currentColor" fontSize={10} />
          <YAxis stroke="currentColor" fontSize={10} allowDecimals={false} />
          <Tooltip
            cursor={{ fillOpacity: 0.08 }}
            contentStyle={chartTooltipStyles.content}
            labelStyle={chartTooltipStyles.label}
            itemStyle={chartTooltipStyles.item}
          />
          <Bar dataKey="visits" fill="currentColor" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
