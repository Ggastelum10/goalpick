import { useState, useMemo } from 'react';
import { Lock, Eye, EyeOff, Loader2, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { usePhaseLockStatus, PhaseLockInfo } from '@/hooks/useLeaguePredictions';
import { useLeaguePhaseOpponentPredictions, OpponentPrediction } from '@/hooks/useLeagueMemberPredictions';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { MatchTime } from '@/components/MatchTime';

interface OpponentPicksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leagueId: string;
}

const PHASE_TAB_LABELS: Record<string, string> = {
  group: 'Group',
  round_of_32: 'R32',
  round_of_16: 'R16',
  quarter_final: 'QF',
  semi_final: 'SF',
  third_place: '3rd',
  final: 'Final',
};

function PhaseContent({ leagueId, phase }: { leagueId: string; phase: PhaseLockInfo }) {
  const { user } = useAuth();
  const { data: predictions, isLoading } = useLeaguePhaseOpponentPredictions(
    leagueId,
    phase.stage,
    phase.isLocked
  );

  const byUser = useMemo(() => {
    if (!predictions) return [];
    const map = new Map<string, { displayName: string; picks: OpponentPrediction[] }>();
    for (const pred of predictions) {
      if (!map.has(pred.user_id)) {
        map.set(pred.user_id, { displayName: pred.display_name, picks: [] });
      }
      map.get(pred.user_id)!.picks.push(pred);
    }
    return Array.from(map.entries())
      .sort(([aId, a], [bId, b]) => {
        if (aId === user?.id) return -1;
        if (bId === user?.id) return 1;
        return a.displayName.localeCompare(b.displayName);
      })
      .map(([userId, data]) => ({ userId, ...data }));
  }, [predictions, user?.id]);

  if (!phase.isLocked) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center gap-3 px-2">
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
          <EyeOff className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium text-foreground text-sm">Phase Not Started</p>
          <p className="text-xs text-muted-foreground mt-1">
            Opponents' predictions will be revealed when the first match of this phase kicks off.
          </p>
        </div>
        {phase.firstMatchDate && (
          <Badge variant="outline" className="mt-1 text-xs">
            <Lock className="h-3 w-3 mr-1" />
            Starts <MatchTime date={phase.firstMatchDate} variant="date-time" />
          </Badge>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (byUser.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No predictions found for this phase.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 mb-2">
        <Badge className="bg-success/15 text-success border-success/30 text-xs">
          <Eye className="h-3 w-3 mr-1" />
          Phase Locked – Predictions Visible
        </Badge>
      </div>
      {/* Native overflow for reliable height measurement in modals */}
      <div className="overflow-y-auto max-h-[45vh] sm:max-h-[50vh]">
        <div className="space-y-3">
          {byUser.map(({ userId, displayName, picks }) => (
            <div key={userId} className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-xs sm:text-sm font-semibold">
                  {displayName}
                  {userId === user?.id && (
                    <span className="text-[10px] sm:text-xs text-muted-foreground ml-1">(You)</span>
                  )}
                </p>
              </div>
              <div className="grid gap-0.5">
                {picks.map((pick) => (
                  <div
                    key={`${pick.user_id}-${pick.match_id}`}
                    className="flex items-center justify-between text-[11px] sm:text-xs bg-muted/50 rounded px-2 py-1.5"
                  >
                    <span className="truncate flex-1 text-muted-foreground min-w-0">
                      {pick.home_team} vs {pick.away_team}
                    </span>
                    <span className="font-mono font-semibold ml-2 whitespace-nowrap">
                      {pick.predicted_home_score} - {pick.predicted_away_score}
                    </span>
                    {pick.points_earned != null && pick.points_earned > 0 && (
                      <Badge className="ml-1.5 bg-gold text-gold-foreground text-[10px] px-1 py-0">
                        +{pick.points_earned}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OpponentPicksContent({ leagueId }: { leagueId: string }) {
  const { data: phases, isLoading } = usePhaseLockStatus(leagueId);
  const [activeTab, setActiveTab] = useState('group');

  const defaultTab = useMemo(() => {
    if (!phases) return 'group';
    const firstLocked = phases.find(p => p.isLocked);
    return firstLocked?.stage || 'group';
  }, [phases]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Tabs value={activeTab || defaultTab} onValueChange={setActiveTab}>
      {/* Scrollable tab row for 7 phase tabs on mobile */}
      <div className="overflow-x-auto -mx-1 px-1 pb-1">
        <TabsList className="inline-flex w-auto min-w-full justify-start gap-0.5">
          {phases?.map((phase) => (
            <TabsTrigger
              key={phase.stage}
              value={phase.stage}
              className="relative gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5 shrink-0"
            >
              {PHASE_TAB_LABELS[phase.stage] || phase.stage}
              {phase.isLocked ? (
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {phases?.map((phase) => (
        <TabsContent key={phase.stage} value={phase.stage}>
          <PhaseContent leagueId={leagueId} phase={phase} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

export function OpponentPicksDialog({ open, onOpenChange, leagueId }: OpponentPicksDialogProps) {
  const isMobile = useIsMobile();

  // Bottom sheet on mobile for better UX
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[85vh] rounded-t-xl px-4 pb-6 pt-4">
          <SheetHeader className="text-left pb-2">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Opponents' Picks
            </SheetTitle>
            <SheetDescription className="text-xs">
              Predictions become visible once the first match of each phase kicks off.
            </SheetDescription>
          </SheetHeader>
          <OpponentPicksContent leagueId={leagueId} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            View Opponents' Picks
          </DialogTitle>
          <DialogDescription>
            Predictions become visible once the first match of each phase kicks off.
          </DialogDescription>
        </DialogHeader>
        <OpponentPicksContent leagueId={leagueId} />
      </DialogContent>
    </Dialog>
  );
}
