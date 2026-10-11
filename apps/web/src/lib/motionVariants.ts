import type { Variants } from 'motion/react';

export const fadeUpItemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 380,
      damping: 28,
      mass: 0.6,
    },
  },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

export const staggeredContainerVariants: Variants = {
  visible: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } },
};
