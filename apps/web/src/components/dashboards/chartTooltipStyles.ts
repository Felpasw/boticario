import type { CSSProperties } from 'react';

export const chartTooltipStyles: {
  content: CSSProperties;
  label: CSSProperties;
  item: CSSProperties;
} = {
  content: {
    backgroundColor: 'hsl(var(--popover))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    color: 'hsl(var(--popover-foreground))',
    fontSize: '12px',
    padding: '6px 10px',
    boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)',
  },
  label: {
    color: 'hsl(var(--popover-foreground))',
    fontWeight: 600,
    marginBottom: '2px',
  },
  item: {
    color: 'hsl(var(--popover-foreground))',
  },
};
