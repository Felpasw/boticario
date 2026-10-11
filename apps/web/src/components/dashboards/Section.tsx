'use client';

import { motion } from 'motion/react';
import type { ReactNode } from 'react';

import { fadeUpItemVariants } from '@/lib/motionVariants';

interface SectionProps {
  children: ReactNode;
  className?: string;
}

export function Section({ children, className }: SectionProps) {
  return (
    <motion.section variants={fadeUpItemVariants} className={className}>
      {children}
    </motion.section>
  );
}
