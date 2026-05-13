import { cn } from '@/lib/utils';
import { ResolvedMatch } from '@/lib/knockoutBracketResolver';
import { Trophy, Minus } from 'lucide-react';
import { AdvancementBadge } from '@/components/AdvancementBadge';

interface ReadOnlyKnockoutMatchNodeProps {
  match: ResolvedMatch;
  compact?: boolean;
  showMatchNumber?: boolean;
}

export function ReadOnlyKnockoutMatchNode({ 
  match, 
  compact = false,
  showMatchNumber = true 
}: ReadOnlyKnockoutMatchNodeProps) {
  const { homeTeam, awayTeam, prediction, winner } = match;
  
  const homeScore = prediction?.predicted_home_score ?? null;
  const awayScore = prediction?.predicted_away_score ?? null;
  const hasPrediction = homeScore !== null && awayScore !== null;
  const isTie = homeScore === awayScore && hasPrediction;
  
  // Penalty scores
  const homePenalty = prediction?.predicted_home_penalty ?? null;
  const awayPenalty = prediction?.predicted_away_penalty ?? null;
  const hasPenalties = isTie && homePenalty !== null && awayPenalty !== null;

  const isHomeWinner = winner?.name === homeTeam?.name;
  const isAwayWinner = winner?.name === awayTeam?.name;

  const TeamRow = ({ 
    team, 
    score, 
    penalty,
    isWinner,
    position 
  }: { 
    team: { name: string; flag: string | null } | null;
    score: number | null;
    penalty: number | null;
    isWinner: boolean;
    position: 'home' | 'away';
  }) => (
    <div 
      className={cn(
        'flex items-center justify-between gap-1 py-1 px-1.5 rounded-sm',
        isWinner && 'bg-success/10',
        !team && 'opacity-50'
      )}
    >
      <div className="flex items-center gap-1 flex-1 min-w-0">
        {team?.flag ? (
          <img 
            src={team.flag} 
            alt="" 
            className={cn(
              'object-cover rounded-sm flex-shrink-0',
              compact ? 'h-3 w-4' : 'h-4 w-5'
            )}
          />
        ) : (
          <div className={cn(
            'bg-muted rounded-sm flex-shrink-0',
            compact ? 'h-3 w-4' : 'h-4 w-5'
          )} />
        )}
        <span className={cn(
          'truncate',
          compact ? 'text-[9px] max-w-[40px]' : 'text-[10px] max-w-[60px]',
          isWinner && 'font-semibold'
        )}>
          {team?.name || 'TBD'}
        </span>
        {isWinner && (
          <Trophy className={cn(
            'text-success flex-shrink-0',
            compact ? 'h-2 w-2' : 'h-2.5 w-2.5'
          )} />
        )}
      </div>
      
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <span className={cn(
          'font-bold min-w-[12px] text-center',
          compact ? 'text-[9px]' : 'text-[10px]',
          isWinner ? 'text-success' : 'text-primary',
          score === null && 'text-muted-foreground'
        )}>
          {score ?? '-'}
        </span>
        {hasPenalties && penalty !== null && (
          <span className={cn(
            'text-muted-foreground',
            compact ? 'text-[8px]' : 'text-[9px]'
          )}>
            ({penalty})
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className={cn(
      'bg-card border rounded-md overflow-hidden',
      compact ? 'min-w-[100px]' : 'min-w-[120px]'
    )}>
      {showMatchNumber && (
        <div
          className={cn(
            'flex items-center justify-center gap-1 py-0.5 px-1 bg-muted/50 border-b',
            compact ? 'text-[8px]' : 'text-[9px]',
            'text-muted-foreground'
          )}
        >
          <span>M{match.matchNumber}</span>
          <AdvancementBadge
            home={match.homeAdvancedFrom}
            away={match.awayAdvancedFrom}
            size="xs"
          />
        </div>
      )}
      
      <div className="p-0.5">
        <TeamRow 
          team={homeTeam} 
          score={homeScore} 
          penalty={homePenalty}
          isWinner={isHomeWinner} 
          position="home" 
        />
        <div className="flex items-center justify-center py-0.5">
          <Minus className={cn('text-muted-foreground', compact ? 'h-2 w-2' : 'h-2.5 w-2.5')} />
        </div>
        <TeamRow 
          team={awayTeam} 
          score={awayScore} 
          penalty={awayPenalty}
          isWinner={isAwayWinner} 
          position="away" 
        />
      </div>
    </div>
  );
}
