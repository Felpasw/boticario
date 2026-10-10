'use client';

import { motion } from 'motion/react';
import { ArrowRight, Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

interface MotionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  revealDelay?: number;
  loading?: boolean;
}

type SliceDirection = 'ltr' | 'rtl';

interface SliceLayer {
  key: string;
  colorClass: string;
  clipPath: string;
  direction: SliceDirection;
  delayOffset: number;
}

const SLICE_LAYERS: SliceLayer[] = [
  {
    key: 'top',
    colorClass: 'bg-zinc-900 dark:bg-zinc-50',
    clipPath: 'polygon(0 0, 100% 0, 100% 35%, 0 35%)',
    direction: 'ltr',
    delayOffset: 0,
  },
  {
    key: 'middle',
    colorClass: 'bg-zinc-500 dark:bg-zinc-400',
    clipPath: 'polygon(0 35%, 100% 35%, 100% 65%, 0 65%)',
    direction: 'rtl',
    delayOffset: 0.1,
  },
  {
    key: 'bottom',
    colorClass: 'bg-zinc-900 dark:bg-zinc-50',
    clipPath: 'polygon(0 65%, 100% 65%, 100% 100%, 0 100%)',
    direction: 'ltr',
    delayOffset: 0.2,
  },
];

const DIRECTION_MAP: Record<SliceDirection, { initialX: string; animateX: string }> = {
  ltr: { initialX: '-100%', animateX: '100%' },
  rtl: { initialX: '100%', animateX: '-100%' },
};

const DEFAULT_REVEAL_DELAY = 1.1;

export function MotionButton({
  label,
  revealDelay = DEFAULT_REVEAL_DELAY,
  loading = false,
  className,
  disabled,
  ...props
}: MotionButtonProps) {
  const isDisabled = disabled ?? loading;

  return (
    <div className="relative inline-block">
      <motion.div
        initial={{ opacity: 0, filter: 'blur(10px)' }}
        animate={{ opacity: 1, filter: 'blur(0px)' }}
        transition={{ delay: revealDelay + 0.3, duration: 0.8 }}
      >
        <button
          {...props}
          disabled={isDisabled}
          data-loading={loading}
          className={cn(
            'group relative inline-block h-auto w-50 rounded-full border-none bg-background p-1 outline-none disabled:cursor-not-allowed disabled:opacity-70',
            className,
          )}
        >
          <span
            aria-hidden="true"
            className="block h-12 w-12 overflow-hidden rounded-full bg-primary duration-500 group-hover:w-full group-disabled:w-12"
          />
          <span
            aria-hidden="true"
            className="absolute top-1/2 left-4 -translate-y-1/2 translate-x-0 duration-500 group-hover:translate-x-[0.4rem] group-data-[loading=true]:translate-x-0"
          >
            {loading ? (
              <Loader2 className="size-6 animate-spin text-background" />
            ) : (
              <ArrowRight className="size-6 text-background" />
            )}
          </span>
          <span className="absolute top-2/4 left-2/4 ml-4 -translate-x-2/4 -translate-y-2/4 text-center text-lg font-medium tracking-tight whitespace-nowrap text-foreground duration-500 group-hover:text-background group-disabled:text-foreground">
            {label}
          </span>
        </button>
      </motion.div>

      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
      >
        {SLICE_LAYERS.map((layer) => {
          const { initialX, animateX } = DIRECTION_MAP[layer.direction];
          return (
            <motion.span
              key={layer.key}
              initial={{ x: initialX, opacity: 0 }}
              animate={{ x: animateX, opacity: [0, 1, 0] }}
              transition={{
                duration: 0.7,
                delay: revealDelay + layer.delayOffset,
                ease: 'easeInOut',
              }}
              style={{ clipPath: layer.clipPath }}
              className={cn('absolute inset-0', layer.colorClass)}
            />
          );
        })}
      </span>
    </div>
  );
}
