import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CheckCircle2, Sparkles, GitMerge } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AdvancementSource = 'real' | 'predicted' | 'tbd';

interface AdvancementBadgeProps {
  /** How the home team slot for this match was filled. */
  home: AdvancementSource;
  /** How the away team slot for this match was filled. */
  away: AdvancementSource;
  /**
   * Visual size of the badge.
   * - 'xs' suits dense bracket headers (KnockoutMatchNode, BracketMatchCard)
   * - 'sm' suits the read-only overview header
   */
  size?: 'xs' | 'sm';
  className?: string;
}

/**
 * Tiny semantic badge that tells the user how a knockout matchup's two
 * participants were determined: from real tournament results, from their
 * own predictions, or a mix. Renders nothing while either side is still
 * pending (TBD), since there's nothing to attribute yet.
 */
export function AdvancementBadge({
  home,
  away,
  size = 'xs',
  className,
}: AdvancementBadgeProps) {
  const { t } = useTranslation();

  if (home === 'tbd' || away === 'tbd') return null;

  const bothReal = home === 'real' && away === 'real';
  const bothPredicted = home === 'predicted' && away === 'predicted';

  const sizeClasses =
    size === 'xs'
      ? 'h-3.5 px-1 gap-0.5 text-[9px]'
      : 'h-4 px-1.5 gap-1 text-[10px]';
  const iconClass = size === 'xs' ? 'h-2.5 w-2.5' : 'h-3 w-3';

  let label: string;
  let tooltip: string;
  let variant: 'default' | 'secondary' | 'outline' = 'outline';
  let extraClasses = '';
  let Icon: typeof CheckCircle2;

  if (bothReal) {
    label = t('knockoutView.advancedFromReal');
    tooltip = t('knockoutView.tooltipReal');
    variant = 'default';
    extraClasses =
      'bg-success/15 text-success border-success/30 hover:bg-success/15';
    Icon = CheckCircle2;
  } else if (bothPredicted) {
    label = t('knockoutView.advancedFromPredicted');
    tooltip = t('knockoutView.tooltipPredicted');
    variant = 'secondary';
    Icon = Sparkles;
  } else {
    const homeShort =
      home === 'real'
        ? t('knockoutView.sourceRealShort')
        : t('knockoutView.sourcePredictedShort');
    const awayShort =
      away === 'real'
        ? t('knockoutView.sourceRealShort')
        : t('knockoutView.sourcePredictedShort');
    label = t('knockoutView.advancedFromMixed');
    tooltip = t('knockoutView.tooltipMixed', {
      home: homeShort,
      away: awayShort,
    });
    variant = 'outline';
    Icon = GitMerge;
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={variant}
            className={cn(sizeClasses, extraClasses, 'cursor-help', className)}
          >
            <Icon className={iconClass} />
            <span className="leading-none">{label}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px]">
          <p className="text-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default AdvancementBadge;