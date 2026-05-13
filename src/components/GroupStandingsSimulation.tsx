import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GroupStanding } from '@/lib/bracketSimulation';
import { cn } from '@/lib/utils';

interface GroupStandingsSimulationProps {
  standings: Record<string, GroupStanding[]>;
}

export function GroupStandingsSimulation({ standings }: GroupStandingsSimulationProps) {
  const sortedGroups = Object.entries(standings).sort(([a], [b]) => a.localeCompare(b));

  if (sortedGroups.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Make predictions for group stage matches to see simulated standings</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {sortedGroups.map(([groupName, teams]) => (
        <Card key={groupName} className="overflow-hidden">
          <CardHeader className="py-3 bg-muted/50">
            <CardTitle className="text-sm font-medium">{groupName}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                  <th className="py-2 px-2 text-left">Team</th>
                  <th className="py-2 px-1 text-center">P</th>
                  <th className="py-2 px-1 text-center">W</th>
                  <th className="py-2 px-1 text-center">D</th>
                  <th className="py-2 px-1 text-center">L</th>
                  <th className="py-2 px-1 text-center">GD</th>
                  <th className="py-2 px-2 text-center font-medium">Pts</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team, idx) => (
                  <tr 
                    key={team.team} 
                    className={cn(
                      "border-b last:border-b-0 transition-colors",
                      idx < 2 && "bg-green-500/10",
                      idx === 2 && "bg-yellow-500/10"
                    )}
                  >
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-4">{idx + 1}</span>
                        {team.flag && (
                          <img src={team.flag} alt="" className="h-4 w-4 rounded-sm" />
                        )}
                        <span className="font-medium truncate max-w-[80px]">{team.team}</span>
                        {idx < 2 && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30">
                            Q
                          </Badge>
                        )}
                        {idx === 2 && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30">
                            ?
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-1 text-center text-muted-foreground">{team.played}</td>
                    <td className="py-2 px-1 text-center text-muted-foreground">{team.won}</td>
                    <td className="py-2 px-1 text-center text-muted-foreground">{team.drawn}</td>
                    <td className="py-2 px-1 text-center text-muted-foreground">{team.lost}</td>
                    <td className={cn(
                      "py-2 px-1 text-center",
                      team.goalDiff > 0 && "text-green-600",
                      team.goalDiff < 0 && "text-red-600"
                    )}>
                      {team.goalDiff > 0 ? `+${team.goalDiff}` : team.goalDiff}
                    </td>
                    <td className="py-2 px-2 text-center font-bold">{team.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
