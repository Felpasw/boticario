import type { ReactNode } from 'react';

interface SectionHeaderProps {
  children: ReactNode;
}

export function SectionHeader({ children }: SectionHeaderProps) {
  return (
    <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
      {children}
    </h2>
  );
}
