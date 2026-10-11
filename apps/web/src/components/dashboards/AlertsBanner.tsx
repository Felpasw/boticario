'use client';

import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import type { ComponentType } from 'react';
import type { Alert } from 'shared';

import { cn } from '@/lib/utils';

interface AlertsBannerProps {
  alerts: Alert[] | undefined;
  className?: string;
}

const SEVERITY_ICON: Record<Alert['severity'], ComponentType<{ className?: string }>> = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle2,
};

const SEVERITY_STYLES: Record<Alert['severity'], string> = {
  info: 'border-sky-500/30 bg-sky-500/5 text-sky-700 dark:text-sky-300',
  warning: 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300',
  success: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300',
};

export function AlertsBanner({ alerts, className }: AlertsBannerProps) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <ul className={cn('flex flex-col gap-2', className)} aria-label="Alertas da loja">
      {alerts.map((alert) => {
        const Icon = SEVERITY_ICON[alert.severity];
        return (
          <li
            key={`${alert.type}-${alert.title}`}
            className={cn(
              'flex items-start gap-3 rounded-md border px-3 py-2 text-sm',
              SEVERITY_STYLES[alert.severity],
            )}
          >
            <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div className="flex flex-col">
              <span className="font-semibold">{alert.title}</span>
              <span className="text-xs opacity-80">{alert.message}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
