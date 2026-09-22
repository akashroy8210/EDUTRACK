import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

export type IconAnimationEffect = 'float' | 'pulse' | 'wiggle' | 'spin' | 'glow' | 'none';

interface MotionIconProps {
  icon: React.ComponentType<any>;
  size?: number;
  weight?: 'regular' | 'bold' | 'duotone' | 'fill' | 'light' | 'thin';
  color?: string;
  effect?: IconAnimationEffect;
  className?: string;
  containerClassName?: string;
  gradientBg?: string;
  interactive?: boolean;
}

export default function MotionIcon({
  icon: Icon,
  size = 20,
  weight = 'duotone',
  color,
  effect = 'float',
  className = '',
  containerClassName = '',
  gradientBg,
  interactive = true,
}: MotionIconProps) {
  const getAnimationProps = () => {
    // Self-running animations removed per design requirements
    return {};
  };

  const anim = getAnimationProps();

  const iconElement = (
    <motion.div
      {...anim}
      whileHover={interactive ? { scale: 1.18, rotate: 6 } : undefined}
      whileTap={interactive ? { scale: 0.9 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={`inline-flex items-center justify-center ${className}`}
      style={{ color }}
    >
      <Icon size={size} weight={weight} />
    </motion.div>
  );

  if (gradientBg) {
    return (
      <div
        className={`inline-flex items-center justify-center p-2.5 rounded-xl shadow-md ${containerClassName}`}
        style={{ background: gradientBg }}
      >
        {iconElement}
      </div>
    );
  }

  return iconElement;
}
