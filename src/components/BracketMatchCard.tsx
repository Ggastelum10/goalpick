import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ResolvedMatch } from '@/lib/knockoutBracketResolver';
import { cn } from '@/lib/utils';
import { MatchTime } from '@/components/MatchTime';
import { AdvancementBadge } from '@/components/AdvancementBadge';

interface BracketMatchCardProps {
  match: ResolvedMatch;
  showScores: boolean;
  compact?: boolean;
  showMetadata?: boolean;
  animationDelay?: number;
  side?: 'left' | 'right' | 'center';
}

interface TeamRowProps {
  team: { name: string; flag?: string | null } | null;
  score: number | null;
  penaltyScore: number | null;
  isWinner: boolean;
  isLoser: boolean;
  showScores: boolean;
  placeholder?: string;
}

const TeamRow = memo(function TeamRow({
  team,
  score,
  penaltyScore,
  isWinner,
  isLoser,
  showScores,
  placeholder = 'TBD',
}: TeamRowProps) {
  const hasPenalties = penaltyScore !== null;

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 transition-all duration-200',
        isWinner && 'bg-success/10 border-l-4 border-l-success',
        isLoser && 'opacity-50',
        !isWinner && !isLoser && 'border-l-4 border-l-transparent'
      )}
    >
      {team?.flag ? (
        <img
          src={team.flag}
          alt=""
          className="w-6 h-4 rounded-sm shadow-sm object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-6 h-4 rounded-sm bg-muted flex-shrink-0" />
      )}
      <span
        className={cn(
          'flex-1 text-sm truncate',
          isWinner && 'font-semibold text-success',
          !team && 'text-muted-foreground italic'
        )}
      >
        {team?.name || placeholder}
      </span>
      {showScores ? (
        <span
          className={cn(
            'font-mono font-bold text-sm min-w-[24px] text-right',
            isWinner && 'text-success'
          )}
        >
          {score !== null ? score : '-'}
          {hasPenalties && (
            <span className="text-xs text-muted-foreground ml-0.5">
              ({penaltyScore})
            </span>
          )}
        </span>
      ) : (
        <span className="text-muted-foreground text-sm">●●</span>
      )}
    </div>
  );
});

export const BracketMatchCard = memo(function BracketMatchCard({
  match,
  showScores,
  compact = false,
  showMetadata = false,
  animationDelay = 0,
  side = 'center',
}: BracketMatchCardProps) {
  const { t } = useTranslation();

  const prediction = match.prediction;
  const homeScore = prediction?.predicted_home_score ?? null;
  const awayScore = prediction?.predicted_away_score ?? null;
  const homePenalty = prediction?.predicted_home_penalty ?? null;
  const awayPenalty = prediction?.predicted_away_penalty ?? null;

  const isHomeWinner = match.winner?.name === match.homeTeam?.name;
  const isAwayWinner = match.winner?.name === match.awayTeam?.name;

  const hasDate = !!match.matchDate;

  return (
    <div
      className={cn(
        'group relative bg-card border border-border rounded-xl overflow-hidden shadow-sm',
        'transition-all duration-200 hover:shadow-lg hover:translate-y-[-2px]',
        compact ? 'w-[140px]' : 'w-[160px]',
        'animate-scale-in'
      )}
      style={{
        animationDelay: `${animationDelay}ms`,
        animationFillMode: 'backwards',
      }}
    >
      {/* Match metadata header */}
      {showMetadata && (match.matchNumber > 0 || hasDate) && (
        <div className="flex items-center justify-between px-2 py-1 bg-muted/50 border-b border-border text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1 min-w-0">
            {match.matchNumber > 0 && (
              <span className="font-medium">M{match.matchNumber}</span>
            )}
            <AdvancementBadge
              home={match.homeAdvancedFrom}
              away={match.awayAdvancedFrom}
              size="xs"
            />
          </div>
          {hasDate && (
            <span className="flex items-center gap-1">
              <MatchTime date={match.matchDate!} variant="date" withLocalTooltip={false} />
              <span className="text-muted-foreground/60">·</span>
              <MatchTime date={match.matchDate!} variant="time" />
            </span>
          )}
        </div>
      )}

      {/* When metadata header is hidden, show the badge as a tiny floating chip */}
      {!showMetadata && (
        <div className="absolute top-1 right-1 z-10">
          <AdvancementBadge
            home={match.homeAdvancedFrom}
            away={match.awayAdvancedFrom}
            size="xs"
          />
        </div>
      )}

      {/* Teams */}
      <div className="divide-y divide-border">
        <TeamRow
          team={match.homeTeam}
          score={homeScore}
          penaltyScore={homePenalty}
          isWinner={isHomeWinner}
          isLoser={isAwayWinner}
          showScores={showScores}
          placeholder={t('knockoutView.pending')}
        />
        <TeamRow
          team={match.awayTeam}
          score={awayScore}
          penaltyScore={awayPenalty}
          isWinner={isAwayWinner}
          isLoser={isHomeWinner}
          showScores={showScores}
          placeholder={t('knockoutView.pending')}
        />
      </div>

      {/* No prediction indicator */}
      {!prediction && match.homeTeam && match.awayTeam && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
          <span className="text-[10px] text-muted-foreground font-medium px-2 py-1 bg-muted rounded-full">
            {t('knockoutView.pending')}
          </span>
        </div>
      )}
    </div>
  );
});

export default BracketMatchCard;
