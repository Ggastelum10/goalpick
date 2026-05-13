import { format, formatDistanceToNow, isPast, differenceInMinutes } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Clock, MapPin, Check, AlertCircle, Zap, Lock, Loader2, Landmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CountdownTimer } from '@/components/CountdownTimer';
import { Match } from '@/hooks/useMatches';
import { Prediction, useAutoSavePrediction, SaveStatus } from '@/hooks/usePredictions';
import { useAutoSaveLeaguePrediction, LeagueSaveStatus } from '@/hooks/useLeaguePredictions';
import { InlineScoreInput } from '@/components/InlineScoreInput';
import { MatchTime } from '@/components/MatchTime';

interface MatchCardProps {
  match: Match;
  prediction?: Prediction | null;
  leagueId?: string;
  phaseLocked?: boolean; // NEW: When true, overrides per-match lock for phase-based locking
  onClick?: () => void;
  showPrediction?: boolean;
  enableInlineEdit?: boolean;
}

const stageKeys: Record<string, string> = {
  group: 'matches.groupStage',
  round_of_32: 'matches.roundOf32',
  round_of_16: 'matches.roundOf16',
  quarter_final: 'matches.quarterFinal',
  semi_final: 'matches.semiFinal',
  third_place: 'matches.thirdPlace',
  final: 'matches.final',
};

const getTeamFlag = (team: string, flagUrl?: string | null) => {
  if (flagUrl) {
    return (
      <div className="relative flex-shrink-0">
        <img 
          src={flagUrl} 
          alt={team} 
          className="h-7 w-10 sm:h-9 sm:w-12 md:h-10 md:w-14 object-cover rounded-md sm:rounded-lg shadow-md ring-1 ring-border/50" 
        />
        <div className="absolute inset-0 rounded-md sm:rounded-lg ring-1 ring-inset ring-white/10" />
      </div>
    );
  }
  return (
    <div className="h-7 w-10 sm:h-9 sm:w-12 md:h-10 md:w-14 bg-gradient-to-br from-muted to-muted/50 rounded-md sm:rounded-lg flex-shrink-0 flex items-center justify-center text-xs sm:text-sm font-bold shadow-md">
      {team.slice(0, 3).toUpperCase()}
    </div>
  );
};

// Inner component for standalone (Mock Pick) predictions
function StandaloneMatchCardContent({ 
  match, 
  prediction, 
  showPrediction, 
  enableInlineEdit 
}: { 
  match: Match; 
  prediction?: Prediction | null;
  showPrediction: boolean;
  enableInlineEdit: boolean;
}) {
  const matchDate = new Date(match.match_date);
  const isLocked = isPast(matchDate);
  const isFinished = match.status === 'finished';

  const {
    homeScore,
    awayScore,
    setHomeScore,
    setAwayScore,
    saveStatus,
    isAuthenticated,
  } = useAutoSavePrediction(match.id);

  const canEdit = enableInlineEdit && !isLocked && !isFinished && isAuthenticated;

  return { homeScore, awayScore, setHomeScore, setAwayScore, saveStatus, isAuthenticated, canEdit };
}

// Inner component for league-specific predictions
function LeagueMatchCardContent({ 
  leagueId,
  match, 
  showPrediction, 
  enableInlineEdit 
}: { 
  leagueId: string;
  match: Match; 
  showPrediction: boolean;
  enableInlineEdit: boolean;
}) {
  const matchDate = new Date(match.match_date);
  const isLocked = isPast(matchDate);
  const isFinished = match.status === 'finished';

  const {
    homeScore,
    awayScore,
    setHomeScore,
    setAwayScore,
    saveStatus,
    isAuthenticated,
  } = useAutoSaveLeaguePrediction(leagueId, match.id);

  const canEdit = enableInlineEdit && !isLocked && !isFinished && isAuthenticated;

  return { homeScore, awayScore, setHomeScore, setAwayScore, saveStatus, isAuthenticated, canEdit };
}

export function MatchCard({ match, prediction, leagueId, phaseLocked, onClick, showPrediction = true, enableInlineEdit = true }: MatchCardProps) {
  const { t } = useTranslation();
  const matchDate = new Date(match.match_date);
  const isLocked = phaseLocked || isPast(matchDate);
  const isLive = match.status === 'live';
  const isFinished = match.status === 'finished';
  const minutesUntil = differenceInMinutes(matchDate, new Date());
  const isUrgent = minutesUntil > 0 && minutesUntil < 60;

  // Only initialize auto-save hooks when editing is enabled (performance optimization)
  const standaloneHook = useAutoSavePrediction(enableInlineEdit && !leagueId ? match.id : '');
  const leagueHook = useAutoSaveLeaguePrediction(
    enableInlineEdit && leagueId ? leagueId : '', 
    enableInlineEdit && leagueId ? match.id : ''
  );

  // Select the active hook based on context
  const activeHook = leagueId ? leagueHook : standaloneHook;
  const { homeScore, awayScore, setHomeScore, setAwayScore, saveStatus, isAuthenticated } = activeHook;

  // In read-only mode, use prediction prop for display instead of hook state
  const displayHomeScore = enableInlineEdit ? homeScore : (prediction?.predicted_home_score ?? null);
  const displayAwayScore = enableInlineEdit ? awayScore : (prediction?.predicted_away_score ?? null);

  // Guarded click handler - ignore clicks from score control areas
  // In read-only mode, card is not clickable
  const handleCardClick = (e: React.MouseEvent) => {
    if (!onClick) return;
    const el = e.target as HTMLElement | null;
    if (el?.closest?.('[data-no-card-click="true"]')) return;
    onClick();
  };

  const canEdit = enableInlineEdit && !isLocked && !isFinished && isAuthenticated;
  const isReadOnly = !enableInlineEdit;

  const getSaveStatusDisplay = (status: SaveStatus) => {
    switch (status) {
      case 'saving':
        return (
          <span className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground animate-pulse">
            <Loader2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 animate-spin" />
            {t('matches.saving')}
          </span>
        );
      case 'saved':
        return (
          <span className="flex items-center gap-1 text-[10px] sm:text-xs text-success animate-in fade-in duration-300">
            <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            {t('matches.saved')}
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1 text-[10px] sm:text-xs text-destructive">
            <AlertCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            {t('matches.failed')}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-300',
        !isReadOnly && 'cursor-pointer hover:shadow-card-hover hover:-translate-y-0.5',
        isReadOnly && 'cursor-default',
        'group w-full max-w-full',
        isLive && 'live-pulse ring-2 ring-destructive shadow-lg shadow-destructive/20',
        isFinished && 'opacity-90',
        isUrgent && !isLive && !isReadOnly && 'ring-1 ring-accent/50'
      )}
      onClick={!isReadOnly ? handleCardClick : undefined}
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      {/* Stage badge */}
      <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 z-10">
        <Badge variant="secondary" className="text-[8px] sm:text-[10px] font-medium backdrop-blur-sm bg-secondary/80 px-1.5 sm:px-2">
          {t(stageKeys[match.stage] || match.stage)}
          {match.group_name && ` - ${match.group_name}`}
        </Badge>
      </div>

      {/* Status indicator */}
      <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-10">
        {isLive && (
          <Badge className="bg-destructive text-destructive-foreground animate-pulse gap-0.5 sm:gap-1 text-[10px] sm:text-xs px-1.5 sm:px-2">
            <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-white animate-pulse" />
            {t('matches.live')}
          </Badge>
        )}
        {isFinished && (
          <Badge variant="outline" className="text-muted-foreground text-[10px] sm:text-xs px-1.5 sm:px-2">
            {t('matches.finished')}
          </Badge>
        )}
        {/* Show "Predicted" status only in edit mode */}
        {!isReadOnly && !isLocked && !isFinished && (homeScore > 0 || awayScore > 0) && (
          <Badge className="bg-success text-success-foreground gap-0.5 sm:gap-1 text-[10px] sm:text-xs px-1.5 sm:px-2">
            <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            <span className="hidden sm:inline">{t('matches.predicted')}</span>
            <span className="sm:hidden">✓</span>
          </Badge>
        )}
        {/* Show "Open" badge only in edit mode */}
        {!isReadOnly && !isLocked && !isFinished && homeScore === 0 && awayScore === 0 && !prediction && (
          <Badge 
            variant="outline" 
            className={cn(
              'transition-colors text-[10px] sm:text-xs px-1.5 sm:px-2',
              isUrgent && 'border-accent text-accent bg-accent/10 animate-pulse'
            )}
          >
            {isUrgent && <AlertCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />}
            {isUrgent ? t('matches.hurry') : t('matches.open')}
          </Badge>
        )}
        {/* Read-only mode: show prediction status */}
        {isReadOnly && !isLocked && !isFinished && prediction && (
          <Badge className="bg-primary/10 text-primary gap-0.5 sm:gap-1 text-[10px] sm:text-xs px-1.5 sm:px-2">
            <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            <span className="hidden sm:inline">{t('matches.yourPick')}</span>
            <span className="sm:hidden">✓</span>
          </Badge>
        )}
        {isReadOnly && !isLocked && !isFinished && !prediction && (
          <Badge variant="outline" className="text-muted-foreground text-[10px] sm:text-xs px-1.5 sm:px-2">
            {t('matches.noPick')}
          </Badge>
        )}
      </div>

      <div className="px-2 sm:px-3 md:px-4 pt-8 sm:pt-10 md:pt-11 pb-2 sm:pb-3">
        {/* Teams with inline predictions */}
        <div className="flex items-center justify-between gap-1 sm:gap-2 md:gap-4">
          {/* Home team with score */}
          <div className="flex-1 flex flex-col items-center text-center min-w-0">
            <div className="flex items-center gap-1 sm:gap-2">
              {getTeamFlag(match.home_team, match.home_team_flag)}
              {/* Home score input - right of flag (only in edit mode) */}
              {showPrediction && !isReadOnly && isAuthenticated && !isFinished && !isLive && !isLocked && (
                <InlineScoreInput
                  value={homeScore}
                  onChange={setHomeScore}
                  disabled={!canEdit}
                  size="sm"
                />
              )}
              {/* Read-only prediction display for dashboard */}
              {showPrediction && isReadOnly && !isFinished && !isLive && !isLocked && displayHomeScore !== null && (
                <div className="flex flex-col items-center px-1">
                  <span className="text-sm sm:text-base md:text-lg font-bold text-primary">
                    {displayHomeScore}
                  </span>
                </div>
              )}
              {/* Static prediction for locked matches */}
              {showPrediction && isAuthenticated && (isLocked || isFinished) && !isLive && prediction && (
                <div className="flex flex-col items-center px-1">
                  <span className="text-sm sm:text-base md:text-lg font-bold text-muted-foreground">
                    {prediction.predicted_home_score}
                  </span>
                </div>
              )}
            </div>
            <p className="mt-1 sm:mt-2 font-semibold text-[10px] sm:text-xs md:text-sm truncate w-full max-w-[80px] sm:max-w-full">{match.home_team}</p>
          </div>

          {/* Score / Time / Countdown */}
          <div className="flex flex-col items-center min-w-[60px] sm:min-w-[80px] md:min-w-[100px] flex-shrink-0">
            {isFinished || isLive ? (
              <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
                <span className={cn(
                  'text-xl sm:text-2xl md:text-3xl lg:text-4xl font-display',
                  isLive && 'text-destructive'
                )}>
                  {match.home_score ?? 0}
                </span>
                <span className="text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground">-</span>
                <span className={cn(
                  'text-xl sm:text-2xl md:text-3xl lg:text-4xl font-display',
                  isLive && 'text-destructive'
                )}>
                  {match.away_score ?? 0}
                </span>
              </div>
            ) : (
              <div className="text-center space-y-0.5 sm:space-y-1">
                {!isLocked && <CountdownTimer targetDate={matchDate} />}
                <div className="flex items-center justify-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs text-muted-foreground">
                  <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  <MatchTime date={matchDate} variant="time" />
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  <MatchTime date={matchDate} variant="date" withLocalTooltip={false} />
                </p>
              </div>
            )}
            {/* Save status in center (only in edit mode) */}
            {showPrediction && !isReadOnly && isAuthenticated && !isFinished && !isLive && !isLocked && (
              <div className="h-4 flex items-center justify-center mt-1">
                {getSaveStatusDisplay(saveStatus)}
              </div>
            )}
            {/* Points earned for finished matches */}
            {isFinished && prediction && prediction.points_earned > 0 && (
              <Badge className="bg-gold text-gold-foreground animate-bounce-in text-[10px] sm:text-xs px-1.5 sm:px-2 mt-1">
                +{prediction.points_earned} pts
              </Badge>
            )}
          </div>

          {/* Away team with score */}
          <div className="flex-1 flex flex-col items-center text-center min-w-0">
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Away score input - left of flag (only in edit mode) */}
              {showPrediction && !isReadOnly && isAuthenticated && !isFinished && !isLive && !isLocked && (
                <InlineScoreInput
                  value={awayScore}
                  onChange={setAwayScore}
                  disabled={!canEdit}
                  size="sm"
                />
              )}
              {/* Read-only prediction display for dashboard */}
              {showPrediction && isReadOnly && !isFinished && !isLive && !isLocked && displayAwayScore !== null && (
                <div className="flex flex-col items-center px-1">
                  <span className="text-sm sm:text-base md:text-lg font-bold text-primary">
                    {displayAwayScore}
                  </span>
                </div>
              )}
              {/* Static prediction for locked matches */}
              {showPrediction && isAuthenticated && (isLocked || isFinished) && !isLive && prediction && (
                <div className="flex flex-col items-center px-1">
                  <span className="text-sm sm:text-base md:text-lg font-bold text-muted-foreground">
                    {prediction.predicted_away_score}
                  </span>
                </div>
              )}
              {getTeamFlag(match.away_team, match.away_team_flag)}
            </div>
            <p className="mt-1 sm:mt-2 font-semibold text-[10px] sm:text-xs md:text-sm truncate w-full max-w-[80px] sm:max-w-full">{match.away_team}</p>
          </div>
        </div>

        {/* Sign in prompt for unauthenticated users */}
        {showPrediction && !isAuthenticated && (
          <div className="mt-2 sm:mt-3 text-center text-[10px] sm:text-xs text-muted-foreground py-2">
            {t('matches.signInToPredict')}
          </div>
        )}

        {/* Lock indicator for locked matches without prediction */}
        {showPrediction && isAuthenticated && (isLocked || isFinished) && !isLive && !prediction && (
          <div className="mt-2 sm:mt-3 flex items-center justify-center gap-1 text-muted-foreground">
            <Lock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            <span className="text-[10px] sm:text-xs">{t('matches.noPrediction')}</span>
          </div>
        )}

        {/* Match info - City and Stadium */}
        {(match.city || match.venue) && (
          <div className="mt-1.5 sm:mt-2 flex flex-col items-center gap-0.5 text-[10px] sm:text-xs text-muted-foreground">
            {match.city && (
              <div className="flex items-center gap-0.5 sm:gap-1">
                <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                <span className="truncate max-w-[150px] sm:max-w-[200px]">{match.city}</span>
              </div>
            )}
            {match.venue && (
              <div className="flex items-center gap-0.5 sm:gap-1">
                <Landmark className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                <span className="truncate max-w-[150px] sm:max-w-[200px]">{match.venue}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}