import { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Match } from '@/hooks/useMatches';
import { Prediction, useAutoSavePrediction } from '@/hooks/usePredictions';
import { useAutoSaveLeaguePrediction } from '@/hooks/useLeaguePredictions';
import { useAuth } from '@/hooks/useAuth';
import { GroupStanding, calculateGroupStandings, areTeamsTrulyTied } from '@/lib/bracketSimulation';
import { cn } from '@/lib/utils';
import { format, isPast } from 'date-fns';
import { Check, Edit2, AlertTriangle, Info, CheckCircle2, Loader2, ChevronDown, GitBranch, ArrowRight, Trophy } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CompactScoreInput } from '@/components/CompactScoreInput';
import { MatchTime } from '@/components/MatchTime';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { TieResolutionModal, computeTiedGroupsData } from '@/components/TieResolutionModal';
import { Progress } from '@/components/ui/progress';
import { TopThirdPlaceDialog } from '@/components/TopThirdPlaceDialog';

interface GroupBracketViewProps {
  matches: Match[];
  predictions: Prediction[];
  onMatchClick: (match: Match) => void;
  tiebreakOverrides?: Record<string, string[]>;
  onTiebreakChange?: (groupName: string, orderedTeams: string[]) => void;
  confirmedGroups?: Record<string, string[]>;
  onConfirmGroup?: (groupName: string, orderedTeams: string[]) => void;
  leagueId?: string;
  onPredictionChange?: (groupName: string, matchId: string) => void;
  onGoToKnockout?: () => void;
  isLeagueLocked?: boolean;
}

interface GroupData {
  groupName: string;
  matches: Match[];
  standings: GroupStanding[];
  tiedTeams: { teams: GroupStanding[]; positions: number[] }[];
  isGroupComplete: boolean;
  predictedMatchCount: number;
  totalMatchCount: number;
}

/**
 * Detect ties that remain after predictable tiebreaker criteria have been applied.
 * Groups teams by points first, then checks if the full cluster can be
 * unambiguously ranked by head-to-head. If not, flags the entire cluster.
 */
function detectTies(standings: GroupStanding[]): { teams: GroupStanding[]; positions: number[] }[] {
  const ties: { teams: GroupStanding[]; positions: number[] }[] = [];
  
  // Group consecutive teams with the same points
  let i = 0;
  while (i < standings.length) {
    const current = standings[i];
    const cluster: GroupStanding[] = [current];
    const positions: number[] = [i];

    let j = i + 1;
    while (j < standings.length && standings[j].points === current.points) {
      cluster.push(standings[j]);
      positions.push(j);
      j++;
    }

    if (cluster.length > 1) {
      // Check if any pair in the cluster is truly tied
      const hasTie = cluster.some((teamA, idxA) =>
        cluster.some((teamB, idxB) =>
          idxA < idxB && areTeamsTrulyTied(teamA, teamB, standings)
        )
      );
      
      if (hasTie) {
        ties.push({ teams: cluster, positions });
      }
    }

    i = j;
  }

  return ties;
}

// Individual match row with auto-save support (Desktop table row)
function GroupMatchRow({
  match,
  prediction,
  leagueId,
  onMatchClick,
  onPredictionSaved,
  isLeagueLocked,
}: {
  match: Match;
  prediction: Prediction | undefined;
  leagueId?: string;
  onMatchClick: (match: Match) => void;
  onPredictionSaved?: () => void;
  isLeagueLocked?: boolean;
}) {
  const { user } = useAuth();
  const isLocked = isPast(new Date(match.match_date));
  const isFinished = match.status === 'finished';

  const standaloneHook = useAutoSavePrediction(!leagueId ? match.id : '');
  const leagueHook = useAutoSaveLeaguePrediction(
    leagueId || '', 
    leagueId ? match.id : ''
  );
  const activeHook = leagueId ? leagueHook : standaloneHook;
  
  const { 
    homeScore, 
    awayScore, 
    setHomeScore, 
    setAwayScore, 
    saveStatus, 
    isAuthenticated 
  } = activeHook;

  const prevSaveStatus = useRef(saveStatus);
  useEffect(() => {
    if (prevSaveStatus.current === 'saving' && saveStatus === 'saved') {
      onPredictionSaved?.();
    }
    prevSaveStatus.current = saveStatus;
  }, [saveStatus, onPredictionSaved]);

  const canEdit = !isLocked && !isFinished && isAuthenticated && !isLeagueLocked;

  const handleRowClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-no-card-click="true"]')) return;
    onMatchClick(match);
  };

  return (
    <tr
      className={cn(
        'border-b last:border-b-0 transition-colors',
        !isLocked && !isFinished && 'cursor-pointer hover:bg-muted/50',
        isFinished && 'opacity-75'
      )}
      onClick={handleRowClick}
    >
      <td className="py-2 px-1 sm:px-2 text-muted-foreground">
        <MatchTime date={match.match_date} variant="date" withLocalTooltip={false} />
      </td>
      <td className="py-2 px-1 text-muted-foreground hidden sm:table-cell">
        <MatchTime date={match.match_date} variant="time" />
      </td>
      <td className="py-2 px-1 sm:px-2 text-right">
        <div className="flex items-center justify-end gap-1 sm:gap-2">
          <span className="font-medium truncate max-w-[60px] sm:max-w-[100px]">
            {match.home_team}
          </span>
          {match.home_team_flag && (
            <img
              src={match.home_team_flag}
              alt=""
              className="h-4 w-5 sm:h-5 sm:w-6 object-cover rounded-sm flex-shrink-0"
            />
          )}
        </div>
      </td>
      <td className="py-1 px-0.5 text-center">
        {canEdit ? (
          <CompactScoreInput
            value={homeScore}
            onChange={setHomeScore}
            disabled={!canEdit}
          />
        ) : (
          <span className="font-bold text-primary">
            {prediction?.predicted_home_score ?? '-'}
          </span>
        )}
      </td>
      <td className="py-2 px-0.5 text-center text-muted-foreground">
        {isFinished ? (
          <span className="font-semibold text-foreground text-xs">
            {match.home_score} - {match.away_score}
          </span>
        ) : (
          <span className="text-xs">vs</span>
        )}
      </td>
      <td className="py-1 px-0.5 text-center">
        {canEdit ? (
          <CompactScoreInput
            value={awayScore}
            onChange={setAwayScore}
            disabled={!canEdit}
          />
        ) : (
          <span className="font-bold text-primary">
            {prediction?.predicted_away_score ?? '-'}
          </span>
        )}
      </td>
      <td className="py-2 px-1 sm:px-2 text-left">
        <div className="flex items-center gap-1 sm:gap-2">
          {match.away_team_flag && (
            <img
              src={match.away_team_flag}
              alt=""
              className="h-4 w-5 sm:h-5 sm:w-6 object-cover rounded-sm flex-shrink-0"
            />
          )}
          <span className="font-medium truncate max-w-[60px] sm:max-w-[100px]">
            {match.away_team}
          </span>
        </div>
      </td>
      <td className="py-2 px-1 text-center">
      {saveStatus === 'error' ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help"><AlertTriangle className="h-3.5 w-3.5 text-destructive mx-auto" /></span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[200px]">
              <p className="text-xs">Failed to save. The phase may have started or your bracket is locked.</p>
            </TooltipContent>
          </Tooltip>
        ) : saveStatus === 'saving' ? (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground mx-auto" />
        ) : saveStatus === 'saved' ? (
          <Check className="h-4 w-4 text-success mx-auto animate-in fade-in duration-200" />
        ) : prediction ? (
          <Check className="h-4 w-4 text-success mx-auto" />
        ) : isLocked || isLeagueLocked ? (
          <span className="text-muted-foreground text-[10px]">—</span>
        ) : (
          <Edit2 className="h-3 w-3 text-muted-foreground mx-auto" />
        )}
      </td>
    </tr>
  );
}

// Mobile match card component for small screens
function MobileMatchCard({
  match,
  prediction,
  leagueId,
  onMatchClick,
  onPredictionSaved,
  isLeagueLocked,
}: {
  match: Match;
  prediction: Prediction | undefined;
  leagueId?: string;
  onMatchClick: (match: Match) => void;
  onPredictionSaved?: () => void;
  isLeagueLocked?: boolean;
}) {
  const { user } = useAuth();
  const isLocked = isPast(new Date(match.match_date));
  const isFinished = match.status === 'finished';

  const standaloneHook = useAutoSavePrediction(!leagueId ? match.id : '');
  const leagueHook = useAutoSaveLeaguePrediction(
    leagueId || '', 
    leagueId ? match.id : ''
  );
  const activeHook = leagueId ? leagueHook : standaloneHook;
  
  const { 
    homeScore, 
    awayScore, 
    setHomeScore, 
    setAwayScore, 
    saveStatus, 
    isAuthenticated 
  } = activeHook;

  const prevSaveStatus = useRef(saveStatus);
  useEffect(() => {
    if (prevSaveStatus.current === 'saving' && saveStatus === 'saved') {
      onPredictionSaved?.();
    }
    prevSaveStatus.current = saveStatus;
  }, [saveStatus, onPredictionSaved]);

  const canEdit = !isLocked && !isFinished && isAuthenticated && !isLeagueLocked;

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-no-card-click="true"]')) return;
    onMatchClick(match);
  };

  const statusIcon = () => {
    if (saveStatus === 'error') {
      return <AlertTriangle className="h-3.5 w-3.5 text-destructive" />;
    }
    if (saveStatus === 'saving') {
      return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />;
    }
    if (saveStatus === 'saved') {
      return <Check className="h-4 w-4 text-success animate-in fade-in duration-200" />;
    }
    if (prediction) {
      return <Check className="h-4 w-4 text-success" />;
    }
    if (isLocked || isLeagueLocked) {
      return <span className="text-muted-foreground text-[10px]">—</span>;
    }
    return <Edit2 className="h-3 w-3 text-muted-foreground" />;
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-1.5 p-2 rounded-md border bg-card transition-colors',
        !isLocked && !isFinished && 'cursor-pointer active:bg-muted/50',
        isFinished && 'opacity-75'
      )}
      onClick={handleCardClick}
    >
      {/* Row 1: Date/Time and Status */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          <MatchTime date={match.match_date} variant="date" withLocalTooltip={false} /> •{' '}
          <MatchTime date={match.match_date} variant="time" />
        </span>
        {statusIcon()}
      </div>
      
      {/* Row 2: Teams and Scores */}
      <div className="flex items-center justify-between gap-2 min-h-[36px]">
        {/* Home Team */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {match.home_team_flag && (
            <img
              src={match.home_team_flag}
              alt=""
              className="h-4 w-5 object-cover rounded-sm flex-shrink-0"
            />
          )}
          <span className="font-medium text-sm truncate max-w-[70px]">
            {match.home_team}
          </span>
        </div>

        {/* Score Section */}
        <div className="flex items-center gap-1 flex-shrink-0" data-no-card-click="true">
          {canEdit ? (
            <>
              <CompactScoreInput
                value={homeScore}
                onChange={setHomeScore}
                disabled={!canEdit}
              />
              <span className="text-xs text-muted-foreground px-0.5">-</span>
              <CompactScoreInput
                value={awayScore}
                onChange={setAwayScore}
                disabled={!canEdit}
              />
            </>
          ) : isFinished ? (
            <span className="font-semibold text-foreground text-sm px-2">
              {match.home_score} - {match.away_score}
            </span>
          ) : (
            <span className="font-bold text-primary text-sm px-2">
              {prediction?.predicted_home_score ?? '-'} - {prediction?.predicted_away_score ?? '-'}
            </span>
          )}
        </div>

        {/* Away Team */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
          <span className="font-medium text-sm truncate max-w-[70px] text-right">
            {match.away_team}
          </span>
          {match.away_team_flag && (
            <img
              src={match.away_team_flag}
              alt=""
              className="h-4 w-5 object-cover rounded-sm flex-shrink-0"
            />
          )}
        </div>
      </div>
    </div>
  );
}

function GroupMatchesTable({
  matches,
  predictions,
  onMatchClick,
  leagueId,
  onPredictionSaved,
  isLeagueLocked,
  t,
}: {
  matches: Match[];
  predictions: Prediction[];
  onMatchClick: (match: Match) => void;
  leagueId?: string;
  onPredictionSaved?: (matchId: string) => void;
  isLeagueLocked?: boolean;
  t: (key: string, options?: Record<string, any>) => string;
}) {
  const sortedMatches = [...matches].sort(
    (a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
  );

  return (
    <div className="w-full">
      {/* Mobile card layout */}
      <div className="sm:hidden space-y-2">
        {sortedMatches.map((match) => (
          <MobileMatchCard
            key={match.id}
            match={match}
            prediction={predictions.find((p) => p.match_id === match.id)}
            leagueId={leagueId}
            onMatchClick={onMatchClick}
            onPredictionSaved={() => onPredictionSaved?.(match.id)}
            isLeagueLocked={isLeagueLocked}
          />
        ))}
      </div>

      {/* Desktop table layout */}
      <div className="hidden sm:block">
        <table className="w-full text-xs sm:text-sm">
          <thead>
            <tr className="border-b bg-muted/30 text-[10px] sm:text-xs text-muted-foreground">
              <th className="py-2 px-1 sm:px-2 text-left">{t('groupBracket.date')}</th>
              <th className="py-2 px-1 text-left">{t('groupBracket.time')}</th>
              <th className="py-2 px-1 sm:px-2 text-right">{t('groupBracket.home')}</th>
              <th className="py-2 px-0.5 text-center w-16 sm:w-20"></th>
              <th className="py-2 px-0.5 text-center w-8 sm:w-12">{t('groupBracket.score')}</th>
              <th className="py-2 px-0.5 text-center w-16 sm:w-20"></th>
              <th className="py-2 px-1 sm:px-2 text-left">{t('groupBracket.away')}</th>
              <th className="py-2 px-1 text-center w-8">{t('groupBracket.status')}</th>
            </tr>
          </thead>
          <tbody>
            {sortedMatches.map((match) => (
              <GroupMatchRow
                key={match.id}
                match={match}
                prediction={predictions.find((p) => p.match_id === match.id)}
                leagueId={leagueId}
                onMatchClick={onMatchClick}
                onPredictionSaved={() => onPredictionSaved?.(match.id)}
                isLeagueLocked={isLeagueLocked}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GroupStandingsTable({
  standings,
  tiedTeams,
  groupName,
  onReorder,
  onConfirmGroupClick,
  isGroupComplete,
  predictedMatchCount,
  totalMatchCount,
  isConfirmed,
  t,
}: {
  standings: GroupStanding[];
  tiedTeams: { teams: GroupStanding[]; positions: number[] }[];
  groupName: string;
  onReorder?: (groupName: string, orderedTeams: string[]) => void;
  onConfirmGroupClick?: (groupName: string) => void;
  isGroupComplete: boolean;
  predictedMatchCount: number;
  totalMatchCount: number;
  isConfirmed?: boolean;
  t: (key: string, options?: Record<string, any>) => string;
}) {
  // Track explicit selections for tied positions
  const [explicitSelections, setExplicitSelections] = useState<Record<number, string>>({});
  
  // Only reset explicit selections when the set of teams or their stats change,
  // NOT when just the order changes (which happens from our own reorder)
  const teamsStatsKey = [...standings]
    .sort((a, b) => a.team.localeCompare(b.team))
    .map(s => `${s.team}:${s.points}:${s.goalDiff}:${s.goalsFor}`)
    .join(',');
  const prevTeamsStatsKey = useRef(teamsStatsKey);
  useEffect(() => {
    if (prevTeamsStatsKey.current !== teamsStatsKey) {
      setExplicitSelections({});
      prevTeamsStatsKey.current = teamsStatsKey;
    }
  }, [teamsStatsKey]);

  const isInTie = (index: number) => {
    return tiedTeams.some(({ positions }) => positions.includes(index));
  };

  // Get the cluster a position belongs to
  const getClusterForPosition = (position: number): { teams: GroupStanding[]; positions: number[] } | null => {
    return tiedTeams.find(cluster => cluster.positions.includes(position)) || null;
  };

  // Handle dropdown selection - swap teams like TieResolutionModal
  const handlePositionChange = useCallback((position: number, selectedTeam: string) => {
    if (!onReorder) return;
    
    const cluster = getClusterForPosition(position);
    if (!cluster) return;

    // Find current team at this position
    const currentTeamAtPosition = standings[position]?.team;
    if (currentTeamAtPosition === selectedTeam) return; // No change

    // Find where the selected team currently is
    const selectedTeamCurrentPosition = standings.findIndex(s => s.team === selectedTeam);
    if (selectedTeamCurrentPosition === -1) return;

    // Create new order by swapping
    const newOrder = standings.map(s => s.team);
    newOrder[position] = selectedTeam;
    newOrder[selectedTeamCurrentPosition] = currentTeamAtPosition;

    // Update explicit selections - mark both positions as explicitly set
    const newSelections = { ...explicitSelections };
    newSelections[position] = selectedTeam;
    // Also mark the swapped position if it's in the same cluster
    if (cluster.positions.includes(selectedTeamCurrentPosition)) {
      newSelections[selectedTeamCurrentPosition] = currentTeamAtPosition;
    }
    setExplicitSelections(newSelections);

    // Apply the reorder
    // Apply the reorder
    onReorder(groupName, newOrder);

  }, [standings, tiedTeams, explicitSelections, onReorder, groupName]);

  return (
    <div className="overflow-x-auto">
      {!isGroupComplete && (
        <div className="flex items-center justify-center gap-2 py-2 mb-2 text-muted-foreground bg-muted/30 rounded-md">
          <Info className="h-3.5 w-3.5" />
          <span className="text-xs">
            {predictedMatchCount}/{totalMatchCount} {t('groupBracket.predicted')}
          </span>
        </div>
      )}
      <table className="w-full text-xs sm:text-sm">
        <thead>
          <tr className="border-b bg-muted/30 text-[10px] sm:text-xs text-muted-foreground">
            <th className="py-2 px-1 text-center w-6">{t('groupBracket.pos')}</th>
            <th className="py-2 px-1 sm:px-2 text-left">{t('groupBracket.team')}</th>
            <th className="py-2 px-1 text-center">Pts</th>
            <th className="py-2 px-1 text-center">MP</th>
            <th className="py-2 px-1 text-center hidden sm:table-cell">W</th>
            <th className="py-2 px-1 text-center hidden sm:table-cell">D</th>
            <th className="py-2 px-1 text-center hidden sm:table-cell">L</th>
            <th className="py-2 px-1 text-center">GF</th>
            <th className="py-2 px-1 text-center">GA</th>
            <th className="py-2 px-1 text-center">GD</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((team, idx) => {
            const teamInTie = isInTie(idx);
            const cluster = getClusterForPosition(idx);
            const canUseDropdown = teamInTie && isGroupComplete && !isConfirmed && onReorder;

            return (
              <tr
                key={team.team}
                className={cn(
                  'border-b last:border-b-0 transition-colors',
                  idx < 2 && 'bg-success/10',
                  idx === 2 && 'bg-warning/10',
                  teamInTie && !isConfirmed && 'bg-amber-500/10'
                )}
              >
                <td className="py-2 px-1 text-center font-bold">{idx + 1}</td>
                <td className="py-2 px-1 sm:px-2">
                  <div className="flex items-center gap-1 sm:gap-2">
                    {canUseDropdown && cluster ? (
                      <Select
                        value={team.team}
                        onValueChange={(value) => handlePositionChange(idx, value)}
                      >
                        <SelectTrigger className="h-7 w-full bg-background border-amber-500/50 text-xs sm:text-sm">
                          <SelectValue>
                            <div className="flex items-center gap-1.5">
                              {team.flag && (
                                <img
                                  src={team.flag}
                                  alt=""
                                  className="h-3.5 w-5 object-cover rounded-sm flex-shrink-0"
                                />
                              )}
                              <span className="font-medium truncate">{team.team}</span>
                            </div>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          {cluster.teams.map(clusterTeam => (
                            <SelectItem key={clusterTeam.team} value={clusterTeam.team}>
                              <div className="flex items-center gap-2">
                                {clusterTeam.flag && (
                                  <img
                                    src={clusterTeam.flag}
                                    alt=""
                                    className="h-3.5 w-5 object-cover rounded-sm"
                                  />
                                )}
                                <span className="font-medium">{clusterTeam.team}</span>
                                <span className="text-xs text-muted-foreground ml-1">
                                  {clusterTeam.points}pts {clusterTeam.goalDiff >= 0 ? '+' : ''}{clusterTeam.goalDiff}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <>
                        {team.flag && (
                          <img
                            src={team.flag}
                            alt=""
                            className="h-4 w-5 sm:h-5 sm:w-6 object-cover rounded-sm flex-shrink-0"
                          />
                        )}
                        <span className="font-medium truncate max-w-[60px] sm:max-w-[100px]">
                          {team.team}
                        </span>
                      </>
                    )}
                    {idx < 2 && (
                      <Badge
                        variant="outline"
                        className="text-[8px] sm:text-[10px] px-1 py-0 h-4 bg-success/20 text-success border-success/30"
                      >
                        Q
                      </Badge>
                    )}
                    {idx === 2 && (
                      <Badge
                        variant="outline"
                        className="text-[8px] sm:text-[10px] px-1 py-0 h-4 bg-warning/20 text-warning border-warning/30"
                      >
                        ?
                      </Badge>
                    )}
                    {teamInTie && !isConfirmed && !canUseDropdown && (
                      <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0" />
                    )}
                  </div>
                </td>
                <td className="py-2 px-1 text-center font-bold">{team.points}</td>
                <td className="py-2 px-1 text-center text-muted-foreground">{team.played}</td>
                <td className="py-2 px-1 text-center text-muted-foreground hidden sm:table-cell">
                  {team.won}
                </td>
                <td className="py-2 px-1 text-center text-muted-foreground hidden sm:table-cell">
                  {team.drawn}
                </td>
                <td className="py-2 px-1 text-center text-muted-foreground hidden sm:table-cell">
                  {team.lost}
                </td>
                <td className="py-2 px-1 text-center text-muted-foreground">{team.goalsFor}</td>
                <td className="py-2 px-1 text-center text-muted-foreground">{team.goalsAgainst}</td>
                <td
                  className={cn(
                    'py-2 px-1 text-center',
                    team.goalDiff > 0 && 'text-success',
                    team.goalDiff < 0 && 'text-destructive'
                  )}
                >
                  {team.goalDiff > 0 ? `+${team.goalDiff}` : team.goalDiff}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {tiedTeams.length > 0 && !isConfirmed && (
        <div className="mt-2 px-2 py-1.5 bg-amber-500/10 rounded-md border border-amber-500/30">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-3 w-3 flex-shrink-0" />
            <span className="flex-1">
              {t('groupBracket.tiedTeamsWarning')}
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to="/tournament-rules" className="flex-shrink-0 hover:text-amber-600 dark:hover:text-amber-300">
                    <Info className="h-3.5 w-3.5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{t('groupBracket.viewFifaRules')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      )}
      {/* Confirm Group button for all complete, unconfirmed groups */}
      {!isConfirmed && onConfirmGroupClick && (
        <div className="mt-3">
          <Button
            size="sm"
            className="w-full gap-2"
            onClick={() => onConfirmGroupClick(groupName)}
          >
            <CheckCircle2 className="h-4 w-4" />
            {t('groupBracket.confirmGroup')}
          </Button>
        </div>
      )}
    </div>
  );
}

export function GroupBracketView({
  matches,
  predictions,
  onMatchClick,
  tiebreakOverrides,
  onTiebreakChange,
  confirmedGroups,
  onConfirmGroup,
  leagueId,
  onPredictionChange,
  onGoToKnockout,
  isLeagueLocked,
}: GroupBracketViewProps) {
  const { t } = useTranslation();
  const [tieResolutionGroup, setTieResolutionGroup] = useState<string | null>(null);
  const [localSavedMatchIds, setLocalSavedMatchIds] = useState<Set<string>>(new Set());
  const [showTopThird, setShowTopThird] = useState(false);

  // Get only group stage matches
  const groupMatches = useMemo(
    () => matches.filter((m) => m.stage === 'group'),
    [matches]
  );

  // Calculate standings
  const standings = useMemo(
    () => calculateGroupStandings(groupMatches, predictions),
    [groupMatches, predictions]
  );

  // Organize matches by group
  const groupsData: GroupData[] = useMemo(() => {
    const groups: Record<string, Match[]> = {};

    groupMatches.forEach((match) => {
      const groupName = match.group_name || 'Unknown';
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(match);
    });

    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([groupName, matches]) => {
        let groupStandings = standings[groupName] || [];

        // Apply tiebreak overrides only for currently unresolved true ties
        if (tiebreakOverrides?.[groupName]) {
          const overrideOrder = tiebreakOverrides[groupName];
          const unresolvedTieTeams = new Set(
            detectTies(groupStandings).flatMap(({ teams }) => teams.map((team) => team.team))
          );

          groupStandings = [...groupStandings].sort((a, b) => {
            // Primary sort: always by points
            if (b.points !== a.points) return b.points - a.points;

            // Only allow manual override when BOTH teams are still in an unresolved tie cluster
            if (!unresolvedTieTeams.has(a.team) || !unresolvedTieTeams.has(b.team)) {
              return 0;
            }

            const aIdx = overrideOrder.indexOf(a.team);
            const bIdx = overrideOrder.indexOf(b.team);
            if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;

            // Fallback to existing tournament-ordered standings
            return 0;
          });
        }

        const tiedTeams = detectTies(groupStandings);
        
        // Calculate prediction completion for this group
        const matchIdSet = new Set(matches.map(m => m.id));
        const predictedSet = new Set<string>();
        // Count unique match_ids that have predictions (server-side)
        predictions.forEach(p => {
          if (matchIdSet.has(p.match_id)) predictedSet.add(p.match_id);
        });
        // Add locally-saved match IDs not yet in server data
        localSavedMatchIds.forEach(id => {
          if (matchIdSet.has(id)) predictedSet.add(id);
        });
        const predictedMatchCount = predictedSet.size;
        const totalMatchCount = matches.length;
        const isGroupComplete = predictedMatchCount === totalMatchCount;

        return {
          groupName,
          matches,
          standings: groupStandings,
          tiedTeams,
          isGroupComplete,
          predictedMatchCount,
          totalMatchCount,
        };
      });
  }, [groupMatches, standings, tiebreakOverrides, predictions, localSavedMatchIds]);

  // Build overridden standings map for tie resolution modal
  const overriddenStandings = useMemo(() => {
    const result: Record<string, GroupStanding[]> = {};
    groupsData.forEach(g => {
      result[g.groupName] = g.standings;
    });
    return result;
  }, [groupsData]);

  // Handle Confirm Group click - opens modal for tied groups, confirms directly otherwise
  const handleConfirmGroupClick = useCallback((groupName: string) => {
    const group = groupsData.find(g => g.groupName === groupName);
    if (!group) return;

    if (group.tiedTeams.length > 0) {
      setTieResolutionGroup(groupName);
    } else {
      onConfirmGroup?.(groupName, group.standings.map(s => s.team));
      toast.success(`${groupName} standings confirmed`, {
        description: 'Knockout bracket updated',
      });
    }
  }, [groupsData, onConfirmGroup]);

  // Handle tie resolution modal confirm
  const handleTieResolutionConfirm = useCallback((resolutions: Record<string, string[]>) => {
    Object.entries(resolutions).forEach(([groupName, orderedTeams]) => {
      onConfirmGroup?.(groupName, orderedTeams);
    });
    setTieResolutionGroup(null);
    toast.success('Group standings confirmed', {
      description: 'Knockout bracket updated',
    });
  }, [onConfirmGroup]);

  // Compute tied groups data for the modal
  const tieResolutionData = useMemo(() => {
    if (!tieResolutionGroup) return [];
    return computeTiedGroupsData(overriddenStandings, [tieResolutionGroup]);
  }, [tieResolutionGroup, overriddenStandings]);

  if (groupsData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>{t('groupBracket.noGroupMatches')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groupsData.map((group) => {
        const isConfirmed = confirmedGroups?.[group.groupName] !== undefined;
        
        return (
          <Card key={group.groupName} className="overflow-hidden">
            <CardHeader className="py-3 bg-gradient-to-r from-primary/10 to-transparent border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">{group.groupName}</CardTitle>
                {isConfirmed && (
                  <Badge variant="outline" className="gap-1 bg-success/10 text-success border-success/30">
                    <CheckCircle2 className="h-3 w-3" />
                    {t('groupBracket.confirmed')}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-1 2xl:grid-cols-2 divide-y 2xl:divide-y-0 2xl:divide-x divide-border">
                {/* Matches Table */}
                <div className="p-3 sm:p-4">
                  <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                    {t('groupBracket.matches')}
                  </h4>
                  <GroupMatchesTable
                    matches={group.matches}
                    predictions={predictions}
                    onMatchClick={onMatchClick}
                    leagueId={leagueId}
                    onPredictionSaved={(matchId) => {
                      setLocalSavedMatchIds(prev => new Set(prev).add(matchId));
                      onPredictionChange?.(group.groupName, matchId);
                    }}
                    isLeagueLocked={isLeagueLocked}
                    t={t}
                  />
                </div>

                {/* Standings Table */}
                <div className="p-3 sm:p-4">
                  <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                    {t('groupBracket.standings')}
                  </h4>
                  <GroupStandingsTable
                    standings={group.standings}
                    tiedTeams={group.tiedTeams}
                    groupName={group.groupName}
                    onReorder={onTiebreakChange}
                    onConfirmGroupClick={handleConfirmGroupClick}
                    isGroupComplete={group.isGroupComplete}
                    predictedMatchCount={group.predictedMatchCount}
                    totalMatchCount={group.totalMatchCount}
                    isConfirmed={isConfirmed}
                    t={t}
                  />
                  
                  {/* Show confirmed status message */}
                  {isConfirmed && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center justify-center gap-2 py-2 text-sm text-success">
                         <CheckCircle2 className="h-4 w-4" />
                        <span>{t('groupBracket.standingsConfirmedForKnockout')}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Continue to Knockout Stage */}
      {onGoToKnockout && groupsData.length > 0 && (() => {
        const totalGroups = groupsData.length;
        const confirmedCount = groupsData.filter(g => confirmedGroups?.[g.groupName]?.length > 0).length;
        const allConfirmed = confirmedCount === totalGroups;
        const progressValue = totalGroups > 0 ? Math.round((confirmedCount / totalGroups) * 100) : 0;

        return (
          <Card className={cn(
            "border-2 transition-colors",
            allConfirmed ? "border-primary bg-primary/5" : "border-border"
          )}>
            <CardContent className="py-5 px-4 sm:px-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">
                    {t('groupBracket.groupsConfirmed', { confirmed: confirmedCount, total: totalGroups })}
                  </span>
                  <span className="font-semibold">{progressValue}%</span>
                </div>
                <Progress value={progressValue} className="h-2" />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowTopThird(true)}
                  disabled={!allConfirmed}
                  className="w-full gap-2"
                  size="lg"
                >
                  <Trophy className="h-4 w-4" />
                  {t('groupBracket.topThirdTeams', 'Top 3rd Teams')}
                </Button>
                <Button
                  onClick={onGoToKnockout}
                  disabled={!allConfirmed}
                  className="w-full gap-2"
                  size="lg"
                >
                  <GitBranch className="h-4 w-4" />
                  {t('groupBracket.continueToKnockout')}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Per-group Tie Resolution Modal */}
      {tieResolutionGroup && tieResolutionData.length > 0 && (
        <TieResolutionModal
          open={true}
          onOpenChange={(open) => {
            if (!open) setTieResolutionGroup(null);
          }}
          tiedGroups={tieResolutionData}
          onConfirm={handleTieResolutionConfirm}
        />
      )}

      {/* Top 3rd-Place Teams Dialog */}
      <TopThirdPlaceDialog
        open={showTopThird}
        onOpenChange={setShowTopThird}
        matches={matches}
        predictions={predictions}
        confirmedGroups={confirmedGroups}
        tiebreakOverrides={tiebreakOverrides}
      />
    </div>
  );
}
