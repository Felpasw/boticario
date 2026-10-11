import Image from 'next/image';

import { cn } from '@/lib/utils';

interface BoticarioLogoProps {
  width: number;
  height: number;
  priority?: boolean;
  className?: string;
}

export function BoticarioLogo({ width, height, priority, className }: BoticarioLogoProps) {
  return (
    <Image
      src="/grupo-boticario.png"
      alt="Grupo Boticário"
      width={width}
      height={height}
      priority={priority}
      className={cn('select-none dark:invert', className)}
    />
  );
}
