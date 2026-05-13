import { cn } from '@/lib/utils';

interface SparkChartProps {
  data: number[];
  className?: string;
  color?: 'primary' | 'success' | 'accent';
}

export function SparkChart({ data, className, color = 'primary' }: SparkChartProps) {
  if (!data || data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const height = 24;
  const width = 60;
  const padding = 2;

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  const colorClass = {
    primary: 'stroke-primary',
    success: 'stroke-success',
    accent: 'stroke-accent',
  }[color];

  const trend = data[data.length - 1] > data[0] ? 'up' : data[data.length - 1] < data[0] ? 'down' : 'flat';

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          points={points}
          fill="none"
          className={cn(colorClass, 'opacity-80')}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Current point */}
        <circle
          cx={width - padding}
          cy={height - padding - ((data[data.length - 1] - min) / range) * (height - padding * 2)}
          r="3"
          className={cn(
            trend === 'up' ? 'fill-success' : trend === 'down' ? 'fill-destructive' : 'fill-muted-foreground'
          )}
        />
      </svg>
    </div>
  );
}
