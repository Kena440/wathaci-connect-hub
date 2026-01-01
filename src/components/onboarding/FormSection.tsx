import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  icon?: LucideIcon;
}

export function FormSection({ title, description, children, className, icon: Icon }: FormSectionProps) {
  return (
    <div className={cn('space-y-5', className)}>
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        )}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground tracking-tight">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
          )}
        </div>
      </div>
      <div className="space-y-4 pl-0 sm:pl-[52px]">
        {children}
      </div>
    </div>
  );
}
