import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { GroupStanding, areTeamsTrulyTied } from '@/lib/bracketSimulation';
import { cn } from '@/lib/utils';

export interface TiedGroupData {
  groupName: string;
  standings: GroupStanding[];
  tiedClusters: { teams: GroupStanding[]; positions: number[] }[];
}

interface TieResolutionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tiedGroups: TiedGroupData[];
  onConfirm: (resolutions: Record<string, string[]>) => void;
}

export function TieResolutionModal({
  open,
  onOpenChange,
  tiedGroups,
  onConfirm,
}: TieResolutionModalProps) {
  // Initialize with current standings order
  const [resolutions, setResolutions] = useState<Record<string, string[]>>(() => {
    return tiedGroups.reduce((acc, group) => {
      acc[group.groupName] = group.standings.map(s => s.team);
      return acc;
    }, {} as Record<string, string[]>);
  });

  // Track which teams in each cluster have been explicitly ranked
  const [selectedPositions, setSelectedPositions] = useState<Record<string, Record<number, string>>>(() => {
    // Initialize with current order for each tied cluster
    const result: Record<string, Record<number, string>> = {};
    tiedGroups.forEach(group => {
      result[group.groupName] = {};
      group.tiedClusters.forEach(cluster => {
        cluster.positions.forEach((pos, idx) => {
          result[group.groupName][pos] = cluster.teams[idx].team;
        });
      });
    });
    return result;
  });

  // Check if all ties are resolved
  const allResolved = useMemo(() => {
    for (const group of tiedGroups) {
      for (const cluster of group.tiedClusters) {
        const groupSelections = selectedPositions[group.groupName] || {};
        const selectedTeams = cluster.positions.map(pos => groupSelections[pos]).filter(Boolean);
        const uniqueTeams = new Set(selectedTeams);
        
        // Each position must have a selection and all must be unique
        if (uniqueTeams.size !== cluster.positions.length) {
          return false;
        }
      }
    }
    return true;
  }, [tiedGroups, selectedPositions]);

  const handlePositionChange = (groupName: string, position: number, team: string) => {
    const group = tiedGroups.find(g => g.groupName === groupName);
    if (!group) return;

    // Find which cluster this position belongs to
    const cluster = group.tiedClusters.find(c => c.positions.includes(position));
    if (!cluster) return;

    // Get current selections for this group
    const currentSelections = { ...selectedPositions[groupName] };
    
    // Find if this team is already selected at another position in this cluster
    const existingPosition = cluster.positions.find(
      pos => currentSelections[pos] === team && pos !== position
    );

    // Swap if team was already selected elsewhere
    if (existingPosition !== undefined) {
      const currentTeamAtPosition = currentSelections[position];
      currentSelections[existingPosition] = currentTeamAtPosition;
    }
    
    currentSelections[position] = team;

    setSelectedPositions(prev => ({
      ...prev,
      [groupName]: currentSelections,
    }));

    // Update the full resolution for this group
    setResolutions(prev => {
      const group = tiedGroups.find(g => g.groupName === groupName);
      if (!group) return prev;

      // Start with current standings order
      const newOrder = [...group.standings.map(s => s.team)];
      
      // Apply all selections from clusters
      for (const cluster of group.tiedClusters) {
        for (const pos of cluster.positions) {
          const selectedTeam = currentSelections[pos];
          if (selectedTeam) {
            newOrder[pos] = selectedTeam;
          }
        }
      }

      return {
        ...prev,
        [groupName]: newOrder,
      };
    });
  };

  const handleConfirm = () => {
    onConfirm(resolutions);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Resolve Group Ties
          </DialogTitle>
          <DialogDescription>
            The following groups have ties that need your input to determine knockout matchups.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto pr-4 -mr-4">
          <div className="space-y-4 pb-2">
            {tiedGroups.map(group => (
              <TiedGroupCard
                key={group.groupName}
                group={group}
                selections={selectedPositions[group.groupName] || {}}
                onPositionChange={(pos, team) => handlePositionChange(group.groupName, pos, team)}
              />
            ))}
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!allResolved} className="gap-2">
            {allResolved && <CheckCircle2 className="h-4 w-4" />}
            Confirm All
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface TiedGroupCardProps {
  group: TiedGroupData;
  selections: Record<number, string>;
  onPositionChange: (position: number, team: string) => void;
}

function TiedGroupCard({ group, selections, onPositionChange }: TiedGroupCardProps) {
  // Build a set of tied positions for highlighting
  const tiedPositions = new Set<number>();
  group.tiedClusters.forEach(cluster => {
    cluster.positions.forEach(pos => tiedPositions.add(pos));
  });

  // Get teams for each cluster dropdown
  const getClusterTeams = (position: number): GroupStanding[] => {
    const cluster = group.tiedClusters.find(c => c.positions.includes(position));
    return cluster?.teams || [];
  };

  return (
    <Card>
      <CardHeader className="py-2 px-3 sm:py-3 sm:px-4">
        <CardTitle className="text-base">{group.groupName}</CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 sm:px-4 sm:pb-4 pt-0">
        <div className="space-y-2">
          {group.standings.map((standing, idx) => {
            const isTied = tiedPositions.has(idx);
            const clusterTeams = getClusterTeams(idx);
            const selectedTeam = selections[idx] || standing.team;

            return (
              <div
                key={standing.team}
                className={cn(
                  "flex items-center gap-3 py-1.5 px-2 sm:py-2 sm:px-3 rounded-md",
                  isTied ? "bg-warning/10 border border-warning/30" : "bg-muted/30"
                )}
              >
                <span className="w-6 text-sm font-medium text-muted-foreground">
                  {idx + 1}.
                </span>

                {isTied ? (
                  <Select
                    value={selectedTeam}
                    onValueChange={(value) => onPositionChange(idx, value)}
                  >
                    <SelectTrigger className="flex-1 h-9 bg-background">
                      <SelectValue>
                        <TeamDisplay team={selectedTeam} standing={group.standings.find(s => s.team === selectedTeam)} />
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {clusterTeams.map(team => (
                        <SelectItem key={team.team} value={team.team}>
                          <TeamDisplay team={team.team} standing={team} />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex-1 flex items-center gap-2">
                    <TeamDisplay team={standing.team} standing={standing} />
                  </div>
                )}

                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {standing.points}pts {standing.goalDiff >= 0 ? '+' : ''}{standing.goalDiff} GD
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

const TeamDisplay = React.forwardRef<
  HTMLDivElement,
  { team: string; standing?: GroupStanding }
>(({ team, standing, ...props }, ref) => {
  return (
    <div ref={ref} className="flex items-center gap-2" {...props}>
      {standing?.flag && (
        <img
          src={standing.flag}
          alt={team}
          className="w-5 h-3.5 object-cover rounded-sm"
        />
      )}
      <span className="font-medium truncate">{team}</span>
    </div>
  );
});
TeamDisplay.displayName = 'TeamDisplay';

/**
 * Helper function to compute tied groups data from standings
 */
export function computeTiedGroupsData(
  standings: Record<string, GroupStanding[]>,
  unconfirmedGroups: string[]
): TiedGroupData[] {
  const tiedGroups: TiedGroupData[] = [];

  for (const groupName of unconfirmedGroups) {
    const groupStandings = standings[groupName];
    if (!groupStandings || groupStandings.length === 0) continue;

    // Find tie clusters
    const tiedClusters: { teams: GroupStanding[]; positions: number[] }[] = [];
    const processed = new Set<number>();

    for (let i = 0; i < groupStandings.length; i++) {
      if (processed.has(i)) continue;

      const cluster: { teams: GroupStanding[]; positions: number[] } = {
        teams: [groupStandings[i]],
        positions: [i],
      };

      // Find all teams tied with this one
      for (let j = i + 1; j < groupStandings.length; j++) {
        if (processed.has(j)) continue;
        
        if (areTeamsTrulyTied(groupStandings[i], groupStandings[j], groupStandings)) {
          cluster.teams.push(groupStandings[j]);
          cluster.positions.push(j);
          processed.add(j);
        }
      }

      if (cluster.teams.length > 1) {
        tiedClusters.push(cluster);
        cluster.positions.forEach(pos => processed.add(pos));
      }
    }

    if (tiedClusters.length > 0) {
      tiedGroups.push({
        groupName,
        standings: groupStandings,
        tiedClusters,
      });
    }
  }

  return tiedGroups.sort((a, b) => a.groupName.localeCompare(b.groupName));
}
