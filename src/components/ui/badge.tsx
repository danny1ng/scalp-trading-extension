import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: 'success' | 'muted';
};

export function Badge({ className, tone = 'muted', ...props }: BadgeProps) {
  return <span className={cn('ui-badge', `ui-badge--${tone}`, className)} {...props} />;
}
