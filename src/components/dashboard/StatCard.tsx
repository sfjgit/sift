import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface StatCardProps {
  label: string;
  value: number | undefined;
  icon: React.ElementType;
  href: string;
  isLoading: boolean;
  valueClass?: string;
  sublabel?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  href,
  isLoading,
  valueClass = '',
  sublabel,
}: StatCardProps) {
  return (
    <Link href={href} className="block group">
      <div className="border rounded-xl p-5 bg-card hover:border-foreground/20 hover:shadow-sm transition-all duration-150">
        <div className="flex items-start justify-between mb-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </p>
          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        {isLoading ? (
          <Skeleton className="h-9 w-20 mb-1" />
        ) : (
          <p className={cn('text-4xl font-bold tracking-tight tabular-nums', valueClass)}>
            {value ?? 0}
          </p>
        )}
        {sublabel && <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>}
        <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
          View all <ArrowRight className="h-3 w-3" />
        </div>
      </div>
    </Link>
  );
}
