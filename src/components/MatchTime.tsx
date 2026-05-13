import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  formatLocalLong,
  formatTournamentDate,
  formatTournamentLong,
  formatTournamentTime,
  TOURNAMENT_TIMEZONE_LABEL,
} from '@/lib/tournamentTime';

type Variant = 'time' | 'date' | 'date-time' | 'long';

interface MatchTimeProps {
  /** ISO string or Date — kickoff timestamp from the FIFA schedule. */
  date: string | Date;
  /**
   * What to render:
   *  - 'time'      → "19:00"
   *  - 'date'      → "Jun 14"
   *  - 'date-time' → "Jun 14 · 19:00"
   *  - 'long'      → "Sat, Jun 14 · 19:00 CT"
   */
  variant?: Variant;
  /** Append the timezone label (e.g. " CT") to the visible value. */
  showZone?: boolean;
  className?: string;
  /** When false, the tooltip with the user's local time is suppressed. */
  withLocalTooltip?: boolean;
}

/**
 * Renders a match kickoff using the official tournament (FIFA) schedule time,
 * with a tooltip showing the same kickoff converted to the viewer's local timezone.
 */
export function MatchTime({
  date,
  variant = 'time',
  showZone = false,
  className,
  withLocalTooltip = true,
}: MatchTimeProps) {
  let primary: string;
  switch (variant) {
    case 'date':
      primary = formatTournamentDate(date);
      break;
    case 'date-time':
      primary = `${formatTournamentDate(date)} · ${formatTournamentTime(date)}`;
      break;
    case 'long':
      primary = formatTournamentLong(date);
      break;
    case 'time':
    default:
      primary = formatTournamentTime(date);
      break;
  }

  const display =
    showZone && variant !== 'long'
      ? `${primary} ${TOURNAMENT_TIMEZONE_LABEL}`
      : primary;

  if (!withLocalTooltip) {
    return <span className={className}>{display}</span>;
  }

  const local = formatLocalLong(date);

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('cursor-help underline-offset-2 decoration-dotted hover:underline', className)}>
            {display}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <div className="font-medium">Your local time</div>
          <div className="text-muted-foreground">{local}</div>
          <div className="mt-1 text-[10px] text-muted-foreground">
            FIFA schedule shown in {TOURNAMENT_TIMEZONE_LABEL}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default MatchTime;
