import type { Variants } from 'motion/react';

export const fadeUpItemVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.98, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
      mass: 0.7,
    },
  },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

export const staggeredContainerVariants: Variants = {
  visible: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } },
};
