import { cn } from '@/lib/utils';
import React, { useEffect, useRef } from 'react';
import { SimulatedTeam } from '@/lib/bracketSimulation';
import { ResolvedMatch } from '@/lib/knockoutBracketResolver';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Check, HelpCircle, Lock, LockOpen, AlertTriangle, Loader2 } from 'lucide-react';
import { CompactScoreInput } from '@/components/CompactScoreInput';
import { InlinePenaltyInput } from '@/components/InlinePenaltyInput';
import { MatchTime } from '@/components/MatchTime';
import { AdvancementBadge } from '@/components/AdvancementBadge';
import { useAutoSavePrediction, SaveStatus } from '@/hooks/usePredictions';
import { useAutoSaveLeaguePrediction, LeagueSaveStatus } from '@/hooks/useLeaguePredictions';
import { useCallback } from 'react';

interface KnockoutMatchNodeProps {
  match: ResolvedMatch;
  actualMatchId?: string;
  onClick?: () => void;
  isCompact?: boolean;
  showConnector?: 'left' | 'right' | 'both' | 'none';
  isLocked?: boolean;
  leagueId?: string;
  className?: string;
  onPredictionSaved?: (matchId: string) => void;
}

function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null;
  
  const badge = (
    <Badge 
      variant={status === 'error' ? 'destructive' : 'secondary'} 
      className="h-4 px-1 gap-0.5 text-[10px]"
    >
      {status === 'saving' && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
      {status === 'saved' && <Check className="h-2.5 w-2.5" />}
      {status === 'saving' && 'Saving'}
      {status === 'saved' && 'Saved'}
      {status === 'error' && 'Error'}
    </Badge>
  );
  
if (status === 'error') {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <span className="cursor-help inline-flex">
            {badge}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px]">
          <p className="text-xs">
            Failed to save. Your bracket may be confirmed or this phase may have started.
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }
  
  return badge;
}

interface TeamRowProps {
  team: SimulatedTeam | null;
  score: number | null;
  penaltyScore: number;
  isWinner: boolean;
  showPenalty: boolean;
  placeholder?: string;
  onScoreChange?: (value: number) => void;
  onPenaltyChange?: (value: number) => void;
  isEditable: boolean;
  needsPenalty: boolean;
}

const TeamRow = React.forwardRef<HTMLDivElement, TeamRowProps>(function TeamRow({
  team,
  score,
  penaltyScore,
  isWinner,
  showPenalty,
  placeholder,
  onScoreChange,
  onPenaltyChange,
  isEditable,
  needsPenalty
}, ref) {
  const stopPropagation = useCallback((e: React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div 
      ref={ref}
      className={cn(
        "flex items-center gap-1.5 px-1.5 py-1.5 min-w-0",
        isWinner && "bg-primary/10 font-medium"
      )}
      onClick={isEditable ? stopPropagation : undefined}
      onMouseDown={isEditable ? stopPropagation : undefined}
      onTouchStart={isEditable ? stopPropagation : undefined}
      onPointerDown={isEditable ? stopPropagation : undefined}
    >
      {team ? (
        <>
          {team.flag ? (
            <img 
              src={team.flag} 
              alt={team.name} 
              className="w-4 h-3 object-cover rounded-sm flex-shrink-0 border border-border/50"
            />
          ) : (
            <div className="w-4 h-3 bg-muted rounded-sm flex-shrink-0" />
          )}
          <span className="truncate text-xs flex-1">{team.name}</span>
        </>
      ) : (
        <>
          <HelpCircle className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          <span className="truncate text-xs text-muted-foreground italic flex-1">
            {placeholder || 'TBD'}
          </span>
        </>
      )}
      
      {/* Score input or static display */}
      {isEditable && onScoreChange ? (
        <div className="flex items-center gap-1 flex-shrink-0">
          <CompactScoreInput
            value={score}
            onChange={onScoreChange}
            disabled={false}
          />
          {/* Inline penalty input when scores are tied */}
          {showPenalty && onPenaltyChange && (
            <div className="flex items-center gap-0.5 pl-1 border-l border-border/50">
              <span className="text-[9px] text-muted-foreground">PK</span>
              <InlinePenaltyInput
                value={penaltyScore}
                onChange={onPenaltyChange}
                disabled={false}
                isWinner={isWinner}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className={cn(
            "text-xs font-mono w-4 text-right",
            (score === null || (score === 0 && !team)) && "text-muted-foreground"
          )}>
            {team ? (score !== null ? score : '-') : '-'}
          </span>
          {showPenalty && (
            <span className={cn(
              "text-[10px] text-muted-foreground",
              isWinner && "text-primary font-medium"
            )}>
              ({penaltyScore})
            </span>
          )}
        </div>
      )}
    </div>
  );
});

export function KnockoutMatchNode({ 
  match, 
  actualMatchId,
  onClick,
  isCompact = false,
  showConnector = 'none',
  isLocked = false,
  leagueId,
  className,
  onPredictionSaved,
}: KnockoutMatchNodeProps) {
  const matchIdForSave = actualMatchId || match.matchId;
  
  const matchHasStarted = match.matchDate ? new Date(match.matchDate) <= new Date() : false;
  const teamsResolved = match.homeTeam !== null && match.awayTeam !== null;
  const enableAutoSave = teamsResolved && !isLocked && !matchHasStarted && matchIdForSave;
  
  const standaloneHook = useAutoSavePrediction(!leagueId && enableAutoSave ? matchIdForSave : '');
  const leagueHook = useAutoSaveLeaguePrediction(
    leagueId || '', 
    leagueId && enableAutoSave ? matchIdForSave : ''
  );
  
  const activeHook = leagueId ? leagueHook : standaloneHook;
  
  const {
    homeScore,
    awayScore,
    homePenalty,
    awayPenalty,
    setHomeScore,
    setAwayScore,
    setHomePenalty,
    setAwayPenalty,
    saveStatus,
    isAuthenticated,
  } = activeHook;
  
  const canEdit = enableAutoSave && isAuthenticated;

  // Notify parent when a prediction is saved
  const prevSaveStatus = useRef(saveStatus);
  useEffect(() => {
    if (prevSaveStatus.current === 'saving' && saveStatus === 'saved') {
      onPredictionSaved?.(matchIdForSave);
    }
    prevSaveStatus.current = saveStatus;
  }, [saveStatus, onPredictionSaved, matchIdForSave]);
  
  const displayHomeScore = canEdit ? homeScore : (match.prediction?.predicted_home_score ?? null);
  const displayAwayScore = canEdit ? awayScore : (match.prediction?.predicted_away_score ?? null);
  const displayHomePenalty = canEdit ? (homePenalty ?? 0) : (match.prediction?.predicted_home_penalty ?? 0);
  const displayAwayPenalty = canEdit ? (awayPenalty ?? 0) : (match.prediction?.predicted_away_penalty ?? 0);
  
  // Check if scores are filled (0 counts as filled)
  const hasScoresFilled = canEdit 
    ? homeScore !== null && awayScore !== null
    : match.prediction !== null;
  
  const hasPrediction = match.prediction !== null || hasScoresFilled;
  const isReady = teamsResolved;
  
  // Check if scores are tied - penalties are REQUIRED for knockout matches when tied
  const bothScoresFilled = displayHomeScore !== null && displayAwayScore !== null;
  const scoresAreTied = bothScoresFilled && displayHomeScore === displayAwayScore && teamsResolved;
  
  // Always show penalties when scores are tied in edit mode, or when they exist in view mode
  const showPenalties = scoresAreTied && (canEdit || displayHomePenalty > 0 || displayAwayPenalty > 0);
  
  // Check if penalties are needed but not entered (warning state)
  const needsPenaltyEntry = scoresAreTied && canEdit && (displayHomePenalty === 0 && displayAwayPenalty === 0);
  const penaltiesAreEqual = displayHomePenalty === displayAwayPenalty && displayHomePenalty > 0;
  const needsValidPenalty = scoresAreTied && canEdit && (needsPenaltyEntry || penaltiesAreEqual);
  
  // Determine winner based on scores and penalties
  let homeIsWinner = false;
  let awayIsWinner = false;
  
  if (teamsResolved && hasScoresFilled && bothScoresFilled) {
    if (displayHomeScore > displayAwayScore) {
      homeIsWinner = true;
    } else if (displayAwayScore > displayHomeScore) {
      awayIsWinner = true;
    } else if (scoresAreTied) {
      // Tied - check penalties
      if (displayHomePenalty > displayAwayPenalty) {
        homeIsWinner = true;
      } else if (displayAwayPenalty > displayHomePenalty) {
        awayIsWinner = true;
      }
      // If penalties are also tied, no winner yet
    }
  }
  
  const stopPropagation = useCallback((e: React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
    e.stopPropagation();
  }, []);
  
  return (
    <div className={cn("relative flex items-center", className)} data-match-number={match.matchNumber}>
      {/* Left connector line */}
      {(showConnector === 'left' || showConnector === 'both') && (
        <div className="absolute -left-4 top-1/2 w-4 h-px bg-border" />
      )}
      
      <div 
        data-no-card-click={canEdit ? "true" : undefined}
        className={cn(
          "border rounded-lg overflow-hidden transition-all w-full",
          !canEdit && isReady && !isLocked
            ? "bg-card hover:border-primary/50 cursor-pointer hover:shadow-md" 
            : isLocked
            ? "bg-muted/20 border-dashed opacity-60"
            : canEdit
            ? "bg-card border-border"
            : "bg-muted/30 border-dashed",
          isCompact ? "min-w-[140px]" : "min-w-[180px]",
          needsValidPenalty && "border-warning/50"
        )}
        style={{ touchAction: 'manipulation' }}
        onClick={!canEdit && isReady && !isLocked ? onClick : undefined}
      >
        {/* Compact match header */}
        <div className="px-1.5 py-1 bg-muted/50 border-b flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            <span className="text-[10px] font-semibold text-foreground flex-shrink-0">
              M{match.matchNumber > 0 ? match.matchNumber : '—'}
            </span>
            {(match.venue || match.city) && (
              <>
                <span className="text-[10px] text-muted-foreground">·</span>
                <span className="text-[10px] text-muted-foreground truncate">
                  {[match.venue, match.city].filter(Boolean).join(', ')}
                </span>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-1 flex-shrink-0">
            <AdvancementBadge
              home={match.homeAdvancedFrom}
              away={match.awayAdvancedFrom}
              size="xs"
            />
            {canEdit && <SaveStatusIndicator status={saveStatus} />}
            {!canEdit && hasPrediction && (
              <Badge variant="secondary" className="h-3.5 px-1 gap-0.5">
                <Check className="h-2 w-2" />
              </Badge>
            )}
            {/* Per-match lock / kickoff pill — makes the per-match lock state
                explicit so users can confirm phase-by-phase locking works. */}
            {teamsResolved && match.matchDate && (
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant={isLocked || matchHasStarted ? 'secondary' : 'outline'}
                      className={cn(
                        'h-3.5 px-1 gap-0.5 text-[9px] cursor-help',
                        (isLocked || matchHasStarted)
                          ? 'bg-muted text-muted-foreground border-muted'
                          : 'border-success/40 text-success'
                      )}
                    >
                      {isLocked || matchHasStarted ? (
                        <Lock className="h-2 w-2" />
                      ) : (
                        <LockOpen className="h-2 w-2" />
                      )}
                      <MatchTime
                        date={match.matchDate}
                        variant="date-time"
                        withLocalTooltip={false}
                      />
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[240px]">
                    <p className="text-xs font-medium">
                      {isLocked || matchHasStarted ? 'Locked' : 'Editable'}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {isLocked || matchHasStarted
                        ? 'Predictions for this match are locked at kickoff.'
                        : 'You can still edit this prediction until kickoff.'}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Kickoff:{' '}
                      <MatchTime
                        date={match.matchDate}
                        variant="long"
                        withLocalTooltip={false}
                      />
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {/* Fallback when teams aren't resolved yet — still show kickoff */}
            {(!teamsResolved || !match.matchDate) && match.matchDate && (
              <Badge variant="outline" className="h-3.5 px-1 text-[9px]">
                <MatchTime date={match.matchDate} variant="date-time" />
              </Badge>
            )}
          </div>
        </div>
        
        {/* Teams with inline penalty inputs */}
        <div 
          onClick={canEdit ? stopPropagation : undefined}
          onMouseDown={canEdit ? stopPropagation : undefined}
          onTouchStart={canEdit ? stopPropagation : undefined}
          onPointerDown={canEdit ? stopPropagation : undefined}
          style={{ touchAction: 'manipulation' }}
        >
          <div className="divide-y">
            <TeamRow 
              team={match.homeTeam} 
              score={displayHomeScore}
              penaltyScore={displayHomePenalty}
              isWinner={homeIsWinner}
              showPenalty={showPenalties}
              placeholder={formatPlaceholder(match.homeSource)}
              onScoreChange={canEdit ? setHomeScore : undefined}
              onPenaltyChange={canEdit ? setHomePenalty : undefined}
              isEditable={canEdit}
              needsPenalty={needsValidPenalty}
            />
            <TeamRow 
              team={match.awayTeam}
              score={displayAwayScore}
              penaltyScore={displayAwayPenalty}
              isWinner={awayIsWinner}
              showPenalty={showPenalties}
              placeholder={formatPlaceholder(match.awaySource)}
              onScoreChange={canEdit ? setAwayScore : undefined}
              onPenaltyChange={canEdit ? setAwayPenalty : undefined}
              isEditable={canEdit}
              needsPenalty={needsValidPenalty}
            />
          </div>
          
          {/* Warning message when penalties needed */}
          {needsValidPenalty && (
            <div className="px-1.5 py-1 bg-warning/10 border-t border-warning/30">
              <div className="flex items-center gap-1 text-[10px] text-warning">
                <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                <span>
                  {needsPenaltyEntry 
                    ? "Draw! Enter penalties to pick winner" 
                    : "Penalties must have a winner"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Right connector line */}
      {(showConnector === 'right' || showConnector === 'both') && (
        <div className="absolute -right-4 top-1/2 w-4 h-px bg-border" />
      )}
    </div>
  );
}

function formatPlaceholder(source: string): string {
  if (source.includes('Group') || source.includes('Match') || source.includes('3rd')) {
    return source;
  }
  
  if (source.startsWith('W')) {
    return `Winner M${source.slice(1)}`;
  }
  if (source.startsWith('L')) {
    return `Loser M${source.slice(1)}`;
  }
  if (source.startsWith('3rd_')) {
    return `3rd Place #${source.slice(4)}`;
  }
  
  const matchResult = source.match(/^(\d)([A-L])$/);
  if (matchResult) {
    const pos = matchResult[1] === '1' ? 'Winner' : 'Runner-up';
    return `${pos} Group ${matchResult[2]}`;
  }
  
  return source;
}
