import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { ProgressRing } from '@/components/ProgressRing';

interface StatCardProps {
  title: string;
  value: number | string;
  prefix?: string;
  suffix?: string;
  icon?: LucideIcon;
  emoji?: string;
  trend?: {
    value: number;
    label?: string;
  };
  progress?: number;
  colorClass?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  prefix,
  suffix,
  icon: Icon,
  emoji,
  trend,
  progress,
  colorClass = 'bg-primary/10 text-primary',
  className,
}: StatCardProps) {
  return (
    <Card className={cn(
      'group relative overflow-hidden transition-all duration-300',
      'hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5',
      className
    )}>
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-primary/[0.02] opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <CardContent className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 md:p-4 relative">
        {/* Icon with optional progress ring */}
        {progress !== undefined ? (
          <div className="flex-shrink-0">
            <ProgressRing progress={progress} size={36} className="sm:scale-105 md:scale-110 origin-center">
              {Icon && <Icon className={cn('h-4 w-4 sm:h-5 sm:w-5', colorClass.split(' ')[1])} />}
              {emoji && <span className="text-sm sm:text-base md:text-lg">{emoji}</span>}
            </ProgressRing>
          </div>
        ) : (
          <div className={cn(
            'h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-lg sm:rounded-xl flex-shrink-0 flex items-center justify-center', 
            colorClass
          )}>
            {Icon && <Icon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />}
            {emoji && <span className="text-sm sm:text-base md:text-lg">{emoji}</span>}
          </div>
        )}
        
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-baseline gap-1 sm:gap-2 flex-wrap">
            <AnimatedCounter
              value={value}
              prefix={prefix}
              suffix={suffix}
              className="text-base sm:text-lg md:text-xl lg:text-2xl font-display truncate"
            />
            {trend && (
              <div className={cn(
                'flex items-center gap-0.5 text-[10px] sm:text-xs font-medium whitespace-nowrap flex-shrink-0',
                trend.value > 0 ? 'text-success' : trend.value < 0 ? 'text-destructive' : 'text-muted-foreground'
              )}>
                {trend.value > 0 ? (
                  <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                ) : trend.value < 0 ? (
                  <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                ) : null}
                <span>{trend.value > 0 ? '+' : ''}{trend.value}%</span>
              </div>
            )}
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{title}</p>
          {progress !== undefined && (
            <div className="mt-1 h-0.5 sm:h-1 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
