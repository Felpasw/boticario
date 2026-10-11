interface IntensityBucket {
  threshold: number;
  className: string;
}

const BUCKETS: IntensityBucket[] = [
  { threshold: 0.15, className: 'bg-zinc-100 dark:bg-zinc-900' },
  { threshold: 0.3, className: 'bg-zinc-200 dark:bg-zinc-800' },
  { threshold: 0.5, className: 'bg-zinc-400 dark:bg-zinc-600' },
  { threshold: 0.75, className: 'bg-zinc-600 dark:bg-zinc-400' },
  { threshold: Infinity, className: 'bg-zinc-900 dark:bg-zinc-100' },
];

export function intensityClass(value: number, max: number): string {
  if (max === 0) return BUCKETS[0].className;
  const ratio = value / max;
  const bucket = BUCKETS.find((b) => ratio < b.threshold);
  return bucket?.className ?? BUCKETS[BUCKETS.length - 1].className;
}
