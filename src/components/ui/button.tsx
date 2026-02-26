import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost';
};

export function Button({ className, variant = 'primary', ...props }: ButtonProps) {
  return <button className={cn('ui-button', `ui-button--${variant}`, className)} {...props} />;
}
