'use client';

import { motion } from 'motion/react';

import { cn } from '@/lib/utils';

interface HeroShutterTextProps {
  text?: string;
  className?: string;
  textSizeClass?: string;
}

const DEFAULT_TEXT = 'BOTICARIO';
const DEFAULT_TEXT_SIZE_CLASS = 'text-[clamp(2.5rem,12vw,12rem)]';

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
    colorClass: 'text-zinc-900 dark:text-zinc-50',
    clipPath: 'polygon(0 0, 100% 0, 100% 35%, 0 35%)',
    direction: 'ltr',
    delayOffset: 0,
  },
  {
    key: 'middle',
    colorClass: 'text-zinc-500 dark:text-zinc-400',
    clipPath: 'polygon(0 35%, 100% 35%, 100% 65%, 0 65%)',
    direction: 'rtl',
    delayOffset: 0.1,
  },
  {
    key: 'bottom',
    colorClass: 'text-zinc-900 dark:text-zinc-50',
    clipPath: 'polygon(0 65%, 100% 65%, 100% 100%, 0 100%)',
    direction: 'ltr',
    delayOffset: 0.2,
  },
];

const DIRECTION_MAP: Record<SliceDirection, { initialX: string; animateX: string }> = {
  ltr: { initialX: '-100%', animateX: '100%' },
  rtl: { initialX: '100%', animateX: '-100%' },
};

const TEXT_STYLE_BASE = 'inline-block leading-none font-black tracking-tighter';

export function HeroShutterText({
  text = DEFAULT_TEXT,
  className,
  textSizeClass = DEFAULT_TEXT_SIZE_CLASS,
}: HeroShutterTextProps) {
  const characters = text.split('');
  const textClasses = cn(TEXT_STYLE_BASE, textSizeClass);

  return (
    <h1 aria-label={text} className={cn('inline-flex items-center justify-center', className)}>
      {characters.map((char, i) => (
        <span key={i} aria-hidden="true" className="relative inline-block overflow-hidden px-[1px]">
          <motion.span
            initial={{ opacity: 0, filter: 'blur(10px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            transition={{ delay: i * 0.04 + 0.3, duration: 0.8 }}
            className={cn(textClasses, 'text-zinc-900 dark:text-white')}
          >
            {char.replace(' ', ' ')}
          </motion.span>

          {SLICE_LAYERS.map((layer) => {
            const { initialX, animateX } = DIRECTION_MAP[layer.direction];
            return (
              <motion.span
                key={layer.key}
                initial={{ x: initialX, opacity: 0 }}
                animate={{ x: animateX, opacity: [0, 1, 0] }}
                transition={{
                  duration: 0.7,
                  delay: i * 0.04 + layer.delayOffset,
                  ease: 'easeInOut',
                }}
                style={{ clipPath: layer.clipPath }}
                className={cn(
                  'pointer-events-none absolute inset-0',
                  textClasses,
                  layer.colorClass,
                )}
              >
                {char.replace(' ', ' ')}
              </motion.span>
            );
          })}
        </span>
      ))}
    </h1>
  );
}
