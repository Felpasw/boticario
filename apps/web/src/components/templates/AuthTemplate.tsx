'use client';

import { motion } from 'motion/react';
import type { ReactNode } from 'react';

interface AuthTemplateProps {
  subtitle: string;
  footer: string;
  heading: ReactNode;
  children: ReactNode;
}

export function AuthTemplate({ subtitle, footer, heading, children }: AuthTemplateProps) {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-14 bg-zinc-50 px-6 py-12 dark:bg-black">
      <div className="flex flex-col items-center gap-4">
        {heading}
        <motion.p
          initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ delay: 0.9, duration: 0.6, ease: 'easeOut' }}
          className="text-xs uppercase tracking-[0.25em] text-zinc-500 dark:text-zinc-400"
        >
          {subtitle}
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ delay: 1.3, duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        {children}
      </motion.div>

      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 0.8, ease: 'easeOut' }}
        className="absolute bottom-6 left-0 right-0 text-center text-[10px] uppercase tracking-[0.3em] text-zinc-500/70 dark:text-zinc-400/50"
      >
        {footer}
      </motion.footer>
    </main>
  );
}
