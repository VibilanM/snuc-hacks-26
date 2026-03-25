import { ReactNode, Key } from 'react';
import { cn } from '@/src/lib/utils';

export interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  key?: Key;
}

export function Card({ children, className, title, subtitle }: CardProps) {
  return (
    <div className={cn("bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden", className)}>
      {(title || subtitle) && (
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          {title && <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">{title}</h3>}
          {subtitle && <p className="text-xs text-slate-500 mt-0.5 italic">{subtitle}</p>}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}
