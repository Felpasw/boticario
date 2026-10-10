import * as React from 'react';

import { cn } from '@/lib/utils';

export type InputProps = React.ComponentProps<'input'>;

function Input({ className, type = 'text', ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm shadow-black/5 transition-colors placeholder:text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
