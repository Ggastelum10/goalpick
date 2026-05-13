import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Match } from '@/hooks/useMatches';
import { Prediction } from '@/hooks/usePredictions';
import { GroupStanding, areTeamsTrulyTied } from '@/lib/bracketSimulation';
import { cn } from '@/lib/utils';
import { Check, AlertTriangle, ChevronDown, Trophy, Minus } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface ReadOnlyGroupCardProps {
  groupName: string;
  matches: Match[];
  predictions: Prediction[];
  standings: GroupStanding[];
}

function detectTies(standings: GroupStanding[]): number[][] {
  const ties: number[][] = [];
  let i = 0;

  while (i < standings.length) {
    const current = standings[i];
    const tiedGroup: number[] = [i];

    let j = i + 1;
    while (j < standings.length) {
      const next = standings[j];
      if (areTeamsTrulyTied(current, next, standings)) {
        tiedGroup.push(j);
        j++;
      } else {
        break;
      }
    }

    if (tiedGroup.length > 1) {
      ties.push(tiedGroup);
    }
    i = j;
  }

  return ties;
}

// Helper to determine matchday from match order
function getMatchday(matchIndex: number, totalMatches: number): number {
  if (totalMatches <= 3) return 1;
  if (totalMatches <= 6) {
    if (matchIndex < 2) return 1;
    if (matchIndex < 4) return 2;
    return 3;
  }
  // Default for larger groups
  return Math.floor(matchIndex / 2) + 1;
}

export function ReadOnlyGroupCard({ 
  groupName, 
  matches, 
  predictions, 
  standings 
}: ReadOnlyGroupCardProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(!isMobile);

  const predictedCount = predictions.filter(p => 
    matches.some(m => m.id === p.match_id)
  ).length;
  const isComplete = predictedCount === matches.length;

  const tiedPositions = useMemo(() => {
    const ties = detectTies(standings);
    const positions = new Set<number>();
    ties.forEach(group => group.forEach(pos => positions.add(pos)));
    return positions;
  }, [standings]);

  const sortedMatches = [...matches].sort(
    (a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
  );

  // Group matches by matchday
  const matchesByDay = useMemo(() => {
    const groups: { matchday: number; matches: Match[] }[] = [];
    let currentDay = 0;
    
    sortedMatches.forEach((match, index) => {
      const day = getMatchday(index, sortedMatches.length);
      if (day !== currentDay) {
        groups.push({ matchday: day, matches: [match] });
        currentDay = day;
      } else {
        groups[groups.length - 1].matches.push(match);
      }
    });
    
    return groups;
  }, [sortedMatches]);

  const cardContent = (
    <>
      {/* Tournament-Format Standings Table */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2 px-1">
          <Trophy className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {t('groupStage.standings', 'Standings')}
          </span>
        </div>
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-xs tabular-nums">
            <thead>
              <tr className="text-muted-foreground border-b bg-muted/40">
                <th className="py-2 px-1.5 text-left w-6">#</th>
                <th className="py-2 px-2 text-left">{t('groupStage.team', 'Team')}</th>
                <th className="py-2 px-1 text-center font-bold text-foreground">PTS</th>
                <th className="py-2 px-1 text-center hidden sm:table-cell">MP</th>
                <th className="py-2 px-1 text-center">W</th>
                <th className="py-2 px-1 text-center">D</th>
                <th className="py-2 px-1 text-center">L</th>
                <th className="py-2 px-1 text-center hidden sm:table-cell">GF</th>
                <th className="py-2 px-1 text-center hidden sm:table-cell">GA</th>
                <th className="py-2 px-1 text-center">GD</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((team, index) => (
                <tr 
                  key={team.team} 
                  className={cn(
                    'border-b last:border-b-0 transition-colors',
                    // Qualified positions (Top 2) - green left border
                    index < 2 && 'border-l-4 border-l-success bg-success/5',
                    // Third place - primary/teal left border
                    index === 2 && 'border-l-4 border-l-primary bg-primary/5',
                    // Fourth place - no special styling
                    index === 3 && 'border-l-4 border-l-transparent',
                    // Tie indicator - amber highlight
                    tiedPositions.has(index) && 'bg-yellow-500/10'
                  )}
                >
                  <td className="py-2 px-1.5 text-muted-foreground">
                    <div className="flex items-center gap-0.5">
                      <span className="font-medium">{index + 1}</span>
                      {tiedPositions.has(index) && (
                        <AlertTriangle className="h-3 w-3 text-yellow-500" />
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-1.5">
                      {team.flag && (
                        <img 
                          src={team.flag} 
                          alt="" 
                          className="h-4 w-5 object-cover rounded-sm shadow-sm" 
                        />
                      )}
                      <span className="font-medium truncate max-w-[80px] sm:max-w-[100px]">
                        {team.team}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-1 text-center font-bold text-primary text-sm">
                    {team.points}
                  </td>
                  <td className="py-2 px-1 text-center text-muted-foreground hidden sm:table-cell">
                    {team.played}
                  </td>
                  <td className="py-2 px-1 text-center">{team.won}</td>
                  <td className="py-2 px-1 text-center">{team.drawn}</td>
                  <td className="py-2 px-1 text-center">{team.lost}</td>
                  <td className="py-2 px-1 text-center hidden sm:table-cell">{team.goalsFor}</td>
                  <td className="py-2 px-1 text-center hidden sm:table-cell">{team.goalsAgainst}</td>
                  <td className={cn(
                    "py-2 px-1 text-center font-medium",
                    team.goalDiff > 0 && "text-success",
                    team.goalDiff < 0 && "text-destructive"
                  )}>
                    {team.goalDiff > 0 ? `+${team.goalDiff}` : team.goalDiff}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Matches Section */}
      <div>
        <div className="flex items-center gap-2 mb-2 px-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            ⚽ {t('groupStage.matches', 'Matches')}
          </span>
        </div>
        <div className="space-y-2">
          {matchesByDay.map(({ matchday, matches: dayMatches }) => (
            <div key={matchday} className="space-y-1">
              <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider px-1">
                MD{matchday}
              </div>
              <div className="space-y-1 rounded-lg border bg-card overflow-hidden">
                {dayMatches.map((match) => {
                  const prediction = predictions.find(p => p.match_id === match.id);
                  const isFinished = match.status === 'finished';
                  
                  const isHomeWinner = prediction && prediction.predicted_home_score > prediction.predicted_away_score;
                  const isAwayWinner = prediction && prediction.predicted_away_score > prediction.predicted_home_score;
                  const isDraw = prediction && prediction.predicted_home_score === prediction.predicted_away_score;

                  return (
                    <div 
                      key={match.id}
                      className={cn(
                        'flex items-center justify-between text-xs py-2 px-2 border-b last:border-b-0',
                        isFinished && 'bg-muted/20'
                      )}
                    >
                      {/* Home Team */}
                      <div className={cn(
                        "flex items-center gap-1.5 flex-1 min-w-0",
                        isHomeWinner && "font-semibold"
                      )}>
                        {match.home_team_flag && (
                          <img src={match.home_team_flag} alt="" className="h-4 w-5 object-cover rounded-sm shadow-sm" />
                        )}
                        <span className={cn(
                          "truncate max-w-[60px] sm:max-w-[80px]",
                          isHomeWinner && "text-success"
                        )}>
                          {match.home_team}
                        </span>
                      </div>
                      
                      {/* Score */}
                      <div className="flex items-center gap-1.5 px-3 shrink-0">
                        {prediction ? (
                          <div className="flex items-center gap-1">
                            <span className={cn(
                              "font-mono font-bold text-sm min-w-[20px] text-center",
                              isHomeWinner && "text-success"
                            )}>
                              {prediction.predicted_home_score}
                            </span>
                            <span className="text-muted-foreground">-</span>
                            <span className={cn(
                              "font-mono font-bold text-sm min-w-[20px] text-center",
                              isAwayWinner && "text-success"
                            )}>
                              {prediction.predicted_away_score}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground font-mono">- : -</span>
                        )}
                        
                        {/* Result indicator */}
                        <div className="w-4 flex justify-center">
                          {isFinished && prediction && (
                            <Check className="h-3.5 w-3.5 text-success" />
                          )}
                          {isDraw && !isFinished && (
                            <Minus className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      {/* Away Team */}
                      <div className={cn(
                        "flex items-center gap-1.5 flex-1 min-w-0 justify-end",
                        isAwayWinner && "font-semibold"
                      )}>
                        <span className={cn(
                          "truncate max-w-[60px] sm:max-w-[80px] text-right",
                          isAwayWinner && "text-success"
                        )}>
                          {match.away_team}
                        </span>
                        {match.away_team_flag && (
                          <img src={match.away_team_flag} alt="" className="h-4 w-5 object-cover rounded-sm shadow-sm" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        
        {/* Actual results for finished matches */}
        {sortedMatches.some(m => m.status === 'finished') && (
          <div className="mt-2 pt-2 border-t">
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Check className="h-3 w-3 text-success" />
              <span>Actual results shown for finished matches</span>
            </p>
          </div>
        )}
      </div>
    </>
  );

  // Mobile: Collapsible accordion
  if (isMobile) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow">
          <CollapsibleTrigger className="w-full">
            <CardHeader className="py-3 px-4 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 border-b cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-display text-lg font-bold tracking-wide">{groupName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={isComplete ? 'default' : 'secondary'} 
                    className={cn(
                      'text-[10px] px-2',
                      isComplete && 'bg-success text-success-foreground'
                    )}
                  >
                    {predictedCount}/{matches.length}
                  </Badge>
                  <ChevronDown className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform duration-200",
                    isOpen && "rotate-180"
                  )} />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="p-3">
              {cardContent}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  // Desktop: Always expanded card
  return (
    <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow h-full">
      <CardHeader className="py-3 px-4 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg font-bold tracking-wide">{groupName}</span>
          </div>
          <Badge 
            variant={isComplete ? 'default' : 'secondary'} 
            className={cn(
              'text-[10px] px-2',
              isComplete && 'bg-success text-success-foreground'
            )}
          >
            {predictedCount}/{matches.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        {cardContent}
      </CardContent>
    </Card>
  );
}
