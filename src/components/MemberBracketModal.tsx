import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReadOnlyGroupOverview } from '@/components/ReadOnlyGroupOverview';
import { ReadOnlyKnockoutOverview } from '@/components/ReadOnlyKnockoutOverview';
import { useLeagueMemberPredictions } from '@/hooks/useLeagueMemberPredictions';
import { useMatches } from '@/hooks/useMatches';
import { Loader2, Trophy } from 'lucide-react';
import { useMemo, useState } from 'react';
import { buildKnockoutBracket } from '@/lib/knockoutBracketResolver';
import { calculateGroupStandings } from '@/lib/bracketSimulation';
import { Card, CardContent } from '@/components/ui/card';

interface MemberBracketModalProps {
  memberId: string;
  memberName: string;
  leagueId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MemberBracketModal({
  memberId,
  memberName,
  leagueId,
  open,
  onOpenChange,
}: MemberBracketModalProps) {
  const { data: predictions, isLoading: predictionsLoading } = useLeagueMemberPredictions(leagueId, memberId);
  const { data: matches, isLoading: matchesLoading } = useMatches();
  const [activeTab, setActiveTab] = useState('groups');

  const isLoading = predictionsLoading || matchesLoading;

  // Calculate group standings from member's predictions
  const groupStandings = useMemo(() => {
    if (!matches || !predictions) return {};
    return calculateGroupStandings(
      matches,
      predictions.map(p => ({
        ...p,
        predicted_home_penalty: p.predicted_home_penalty ?? null,
        predicted_away_penalty: p.predicted_away_penalty ?? null,
      }))
    );
  }, [matches, predictions]);

  // Build confirmed standings from group standings (all groups confirmed for viewing)
  const confirmedStandings = useMemo(() => {
    const result: Record<string, string[]> = {};
    for (const [groupName, teams] of Object.entries(groupStandings)) {
      result[groupName] = teams.map(t => t.team);
    }
    return result;
  }, [groupStandings]);

  // Calculate predicted champion
  const champion = useMemo(() => {
    if (!matches || !predictions || Object.keys(confirmedStandings).length < 12) return null;
    
    const bracket = buildKnockoutBracket(
      matches,
      predictions.map(p => ({
        ...p,
        predicted_home_penalty: p.predicted_home_penalty ?? null,
        predicted_away_penalty: p.predicted_away_penalty ?? null,
      })),
      confirmedStandings,
      {}
    );
    return bracket.champion;
  }, [matches, predictions, confirmedStandings]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{memberName}'s Bracket</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !predictions || predictions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No predictions available to view.
          </div>
        ) : (
          <div className="flex-1 overflow-auto space-y-4">
            {/* Champion Display */}
            {champion && (
              <Card className="bg-gold/10 border-gold/30">
                <CardContent className="py-3">
                  <div className="flex items-center justify-center gap-3">
                    <Trophy className="h-5 w-5 text-gold" />
                    {champion.flag && (
                      <img 
                        src={champion.flag} 
                        alt={champion.name}
                        className="w-8 h-6 object-cover rounded shadow ring-1 ring-gold/20"
                      />
                    )}
                    <span className="font-bold">{champion.name}</span>
                    <span className="text-sm text-muted-foreground">
                      Predicted Champion
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full justify-start">
                <TabsTrigger value="groups">Groups</TabsTrigger>
                <TabsTrigger value="knockout">Knockout</TabsTrigger>
              </TabsList>
              
              <TabsContent value="groups" className="mt-4">
                <ReadOnlyGroupOverview 
                  matches={matches || []} 
                  predictions={predictions}
                />
              </TabsContent>
              
              <TabsContent value="knockout" className="mt-4">
                <ReadOnlyKnockoutOverview 
                  matches={matches || []} 
                  predictions={predictions.map(p => ({
                    ...p,
                    predicted_home_penalty: p.predicted_home_penalty ?? null,
                    predicted_away_penalty: p.predicted_away_penalty ?? null,
                  }))}
                  confirmedStandings={confirmedStandings}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
