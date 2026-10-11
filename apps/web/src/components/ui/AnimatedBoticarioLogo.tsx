'use client';

import { motion } from 'motion/react';
import Image from 'next/image';

import { cn } from '@/lib/utils';

interface AnimatedBoticarioLogoProps {
  width: number;
  height: number;
  priority?: boolean;
  className?: string;
}

export function AnimatedBoticarioLogo({
  width,
  height,
  priority,
  className,
}: AnimatedBoticarioLogoProps) {
  return (
    <div className={cn('inline-block select-none dark:invert', className)}>
      <motion.div
        initial={{ opacity: 0, filter: 'blur(12px)', scale: 0.96 }}
        animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
        transition={{ duration: 1.1, ease: 'easeOut' }}
      >
        <Image
          src="/grupo-boticario.png"
          alt="Grupo Boticário"
          width={width}
          height={height}
          priority={priority}
        />
      </motion.div>
    </div>
  );
}
