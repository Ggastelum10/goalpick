import React, { memo, useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface ConnectorPath {
  id: string;
  d: string;
  isWinner: boolean;
}

interface BracketConnectorsProps {
  containerRef: React.RefObject<HTMLElement>;
  matchRefs: Map<string, HTMLElement>;
  connections: Array<{
    from: string[];
    to: string;
    winnerId?: string;
  }>;
  animate?: boolean;
  className?: string;
}

/**
 * SVG connector lines between bracket matches
 * 
 * This component calculates and renders curved Bézier paths
 * connecting matches from one round to the next.
 * 
 * Note: This is a placeholder implementation. The full version
 * requires DOM measurements from rendered match cards.
 */
export const BracketConnectors = memo(function BracketConnectors({
  containerRef,
  matchRefs,
  connections,
  animate = true,
  className,
}: BracketConnectorsProps) {
  const [paths, setPaths] = useState<ConnectorPath[]>([]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current || matchRefs.size === 0) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();

    setDimensions({
      width: containerRect.width,
      height: containerRect.height,
    });

    const newPaths: ConnectorPath[] = [];

    connections.forEach((conn, idx) => {
      const targetEl = matchRefs.get(conn.to);
      if (!targetEl) return;

      const targetRect = targetEl.getBoundingClientRect();
      const targetY = targetRect.top - containerRect.top + targetRect.height / 2;
      const targetX = targetRect.left - containerRect.left;

      conn.from.forEach((fromId, fromIdx) => {
        const sourceEl = matchRefs.get(fromId);
        if (!sourceEl) return;

        const sourceRect = sourceEl.getBoundingClientRect();
        const sourceY = sourceRect.top - containerRect.top + sourceRect.height / 2;
        const sourceX = sourceRect.right - containerRect.left;

        // Calculate Bézier curve control points
        const midX = (sourceX + targetX) / 2;
        
        const path = `
          M ${sourceX} ${sourceY}
          C ${midX} ${sourceY},
            ${midX} ${targetY},
            ${targetX} ${targetY}
        `;

        newPaths.push({
          id: `${fromId}-${conn.to}`,
          d: path,
          isWinner: conn.winnerId === fromId,
        });
      });
    });

    setPaths(newPaths);
  }, [containerRef, matchRefs, connections]);

  if (paths.length === 0 || dimensions.width === 0) return null;

  return (
    <svg
      className={cn('absolute inset-0 pointer-events-none z-0', className)}
      width={dimensions.width}
      height={dimensions.height}
      viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
    >
      <defs>
        <linearGradient id="winnerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity="0.3" />
          <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity="0.8" />
        </linearGradient>
      </defs>
      
      {paths.map((path, idx) => (
        <path
          key={path.id}
          d={path.d}
          fill="none"
          stroke={path.isWinner ? 'url(#winnerGradient)' : 'hsl(var(--muted-foreground))'}
          strokeWidth={path.isWinner ? 2 : 1}
          strokeOpacity={path.isWinner ? 1 : 0.3}
          strokeDasharray={path.isWinner ? 'none' : '4 2'}
          className={cn(
            animate && 'animate-draw-line'
          )}
          style={{
            animationDelay: `${idx * 100}ms`,
          }}
        />
      ))}
    </svg>
  );
});

export default BracketConnectors;
