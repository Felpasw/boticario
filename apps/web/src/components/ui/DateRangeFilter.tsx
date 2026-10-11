'use client';

import { Calendar as CalendarIcon, ChevronDown, X } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type DateRangeValue = DateRange | undefined;

interface DateRangeFilterProps {
  value: DateRangeValue;
  onValueChange: (range: DateRangeValue) => void;
  label?: string;
  id?: string;
  className?: string;
  ariaLabel?: string;
}

const PLACEHOLDER = 'Filtrar por período…';
const CLEAR_LABEL = 'Limpar';
const DEFAULT_ID = 'date-range-filter';

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function buildTriggerText(range: DateRangeValue): string {
  if (!range?.from) return PLACEHOLDER;
  if (!range.to) return `${formatDate(range.from)} – …`;
  return `${formatDate(range.from)} – ${formatDate(range.to)}`;
}

export function DateRangeFilter({
  value,
  onValueChange,
  label,
  id = DEFAULT_ID,
  className,
  ariaLabel,
}: DateRangeFilterProps) {
  const hasSelection = Boolean(value?.from);
  const triggerText = buildTriggerText(value);

  return (
    <div className={cn('flex w-full flex-col gap-1.5', className)}>
      {label ? (
        <Label htmlFor={id} className="px-1">
          {label}
        </Label>
      ) : null}
      <Popover>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            aria-label={ariaLabel ?? label ?? PLACEHOLDER}
            data-has-selection={hasSelection}
            className="relative z-10 flex h-11 w-full items-center gap-2 rounded-xl border border-input/60 bg-card pl-4 pr-1.5 text-sm shadow-sm transition-colors hover:border-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <CalendarIcon size={16} aria-hidden="true" className="shrink-0 text-muted-foreground" />
            <span
              data-has-selection={hasSelection}
              className="flex-1 truncate text-left text-muted-foreground data-[has-selection=true]:text-foreground"
            >
              {triggerText}
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted/50">
              <ChevronDown size={16} aria-hidden="true" />
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar mode="range" selected={value} onSelect={onValueChange} numberOfMonths={2} />
          {hasSelection ? (
            <div className="flex justify-end border-t border-border/50 px-2 py-1.5">
              <button
                type="button"
                onClick={() => onValueChange(undefined)}
                className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              >
                <X size={12} aria-hidden="true" />
                {CLEAR_LABEL}
              </button>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  );
}
