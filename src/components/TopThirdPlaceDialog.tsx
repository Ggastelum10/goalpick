import { useMemo, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { CheckCircle2, AlertTriangle, Trophy, Info } from 'lucide-react';
import { Match } from '@/hooks/useMatches';
import { Prediction } from '@/hooks/usePredictions';
import {
  calculateGroupStandings,
  GroupStanding,
} from '@/lib/bracketSimulation';
import {
  rankThirdPlaceTeams,
  getThirdPlaceSlotAssignments,
  validateThirdPlaceCompliance,
} from '@/lib/thirdPlaceRanking';
import { cn } from '@/lib/utils';

interface TopThirdPlaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matches: Match[];
  predictions: Prediction[];
  confirmedGroups?: Record<string, string[]>;
  tiebreakOverrides?: Record<string, string[]>;
}

export function TopThirdPlaceDialog({
  open,
  onOpenChange,
  matches,
  predictions,
  confirmedGroups,
  tiebreakOverrides,
}: TopThirdPlaceDialogProps) {
  const { t } = useTranslation();

  // Recompute standings with the same overrides logic as buildKnockoutBracket
  const standings = useMemo(() => {
    const base = calculateGroupStandings(matches, predictions);
    const overrides = confirmedGroups || tiebreakOverrides;
    if (!overrides) return base;

    const result: Record<string, GroupStanding[]> = {};
    for (const [groupName, groupStandings] of Object.entries(base)) {
      const order = overrides[groupName];
      if (order && order.length > 0) {
        result[groupName] = [...groupStandings].sort((a, b) => {
          const ai = order.indexOf(a.team);
          const bi = order.indexOf(b.team);
          if (ai !== -1 && bi !== -1) return ai - bi;
          if (ai !== -1) return -1;
          if (bi !== -1) return 1;
          return 0;
        });
      } else {
        result[groupName] = groupStandings;
      }
    }
    return result;
  }, [matches, predictions, confirmedGroups, tiebreakOverrides]);

  const ranked = useMemo(() => rankThirdPlaceTeams(standings), [standings]);
  const assignments = useMemo(
    () => getThirdPlaceSlotAssignments(standings, matches),
    [standings, matches]
  );
  const compliance = useMemo(
    () => validateThirdPlaceCompliance(ranked, assignments, matches),
    [ranked, assignments, matches]
  );

  // Map team -> assignment for fast lookup
  const assignmentByTeam = useMemo(() => {
    const map = new Map<string, typeof assignments[number]>();
    assignments.forEach(a => map.set(a.team.team, a));
    return map;
  }, [assignments]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Trophy className="h-5 w-5 text-primary" />
            {t('groupBracket.topThirdTitle', 'Top 3rd-Place Teams')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'groupBracket.topThirdSubtitle',
              'The 8 best third-placed teams (out of 12 groups) advance to the Round of 32. Ranking follows official tournament tiebreaker rules.'
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="p-6 space-y-6">
            {/* Ranking table */}
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wide">
                    <th className="py-2 px-2 text-left w-10">#</th>
                    <th className="py-2 px-2 text-left">{t('groupBracket.team', 'Team')}</th>
                    <th className="py-2 px-1 text-center w-10">Grp</th>
                    <th className="py-2 px-1 text-center w-10">Pts</th>
                    <th className="py-2 px-1 text-center w-10">GD</th>
                    <th className="py-2 px-1 text-center w-10">GF</th>
                    <th className="py-2 px-1 text-center w-10">GA</th>
                    <th className="py-2 px-2 text-left">
                      {t('groupBracket.topThirdSlot', 'R32 Slot')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((r, idx) => {
                    const assignment = assignmentByTeam.get(r.team);
                    const showCutLine = idx === 8;
                    return (
                      <Fragment key={r.team}>
                        {showCutLine && (
                          <tr>
                            <td colSpan={8} className="px-2 py-1.5 bg-muted/30 border-y border-dashed border-muted-foreground/40">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                                <div className="flex-1 h-px bg-muted-foreground/30" />
                                {t('groupBracket.topThirdCutLine', 'Qualification cut-line')}
                                <div className="flex-1 h-px bg-muted-foreground/30" />
                              </div>
                            </td>
                          </tr>
                        )}
                        <tr
                          className={cn(
                            'border-b last:border-b-0 transition-colors',
                            r.qualifies ? 'bg-success/5' : 'bg-destructive/5 opacity-70'
                          )}
                        >
                          <td className="py-2 px-2 font-semibold text-muted-foreground">
                            {r.rank}
                          </td>
                          <td className="py-2 px-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {r.flag && (
                                <img src={r.flag} alt="" className="h-4 w-4 rounded-sm shrink-0" />
                              )}
                              <span className="font-medium truncate">{r.team}</span>
                              {r.resolvedByLot && (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-[10px] px-1 py-0 h-4',
                                    r.lotAffectsQualification
                                      ? 'border-destructive/50 text-destructive'
                                      : 'border-amber-500/40 text-amber-700 dark:text-amber-400'
                                  )}
                                  title={
                                    r.lotAffectsQualification
                                      ? 'Drawing of lots could change WHO qualifies'
                                      : 'Drawing of lots determines order only'
                                  }
                                >
                                  {r.lotAffectsQualification ? 'lot ⚠' : 'lot'}
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-1 text-center font-mono text-xs">
                            {r.groupOrigin}
                          </td>
                          <td className="py-2 px-1 text-center font-bold">{r.points}</td>
                          <td
                            className={cn(
                              'py-2 px-1 text-center',
                              r.goalDiff > 0 && 'text-success',
                              r.goalDiff < 0 && 'text-destructive'
                            )}
                          >
                            {r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}
                          </td>
                          <td className="py-2 px-1 text-center text-muted-foreground">
                            {r.goalsFor}
                          </td>
                          <td className="py-2 px-1 text-center text-muted-foreground">
                            {r.goalsAgainst}
                          </td>
                          <td className="py-2 px-2 text-xs">
                            {assignment ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="font-mono font-semibold text-primary">
                                  {assignment.slotLabel}
                                </span>
                                <span className="text-muted-foreground">
                                  M{assignment.matchNumber} · vs {assignment.opponentLabel}
                                </span>
                              </div>
                            ) : r.qualifies ? (
                              <span className="text-muted-foreground italic">—</span>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1 py-0 h-5 border-destructive/40 text-destructive"
                              >
                                {t('groupBracket.topThirdEliminated', 'Eliminated')}
                              </Badge>
                            )}
                          </td>
                        </tr>
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Compliance check */}
            <div
              className={cn(
                'rounded-lg border p-4 space-y-2',
                compliance.ok
                  ? 'border-success/30 bg-success/5'
                  : 'border-destructive/40 bg-destructive/5'
              )}
            >
              <div className="flex items-center gap-2 font-semibold text-sm">
                {compliance.ok ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="text-success">
                      {t('groupBracket.complianceOk', 'All FIFA constraints satisfied')}
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="text-destructive">
                      {t('groupBracket.complianceIssues', 'FIFA compliance issues detected')}
                    </span>
                  </>
                )}
              </div>
              {compliance.issues.length > 0 && (
                <ul className="space-y-1 text-xs pl-6 list-disc">
                  {compliance.issues.map((issue, i) => (
                    <li
                      key={i}
                      className={cn(
                        issue.severity === 'error' ? 'text-destructive' : 'text-amber-700 dark:text-amber-400'
                      )}
                    >
                      {issue.message}
                    </li>
                  ))}
                </ul>
              )}
              {compliance.ok && compliance.issues.length === 0 && (
                <p className="text-xs text-muted-foreground pl-6">
                  {t(
                    'groupBracket.complianceOkDetail',
                    'Top 8 third-placed teams are correctly assigned to their R32 slots, no team meets a same-group opponent before the final, and all eligibility constraints are respected.'
                  )}
                </p>
              )}
            </div>

            <Separator />

            {/* FIFA rules accordion */}
            <Accordion type="single" collapsible defaultValue="rules">
              <AccordionItem value="rules" className="border-none">
                <AccordionTrigger className="text-sm font-semibold py-2 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary" />
                    {t('groupBracket.fifaRulesTitle', 'How third-place teams are ranked & placed')}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-xs text-muted-foreground space-y-3 pt-2">
                  <div>
                    <p className="font-medium text-foreground mb-1">
                      {t('groupBracket.fifaRulesRanking', 'Ranking criteria (in order)')}
                    </p>
                    <ol className="list-decimal pl-5 space-y-0.5">
                      <li>Greater number of points</li>
                      <li>Superior goal difference</li>
                      <li>Greater number of goals scored</li>
                      <li>Fewer goals conceded</li>
                      <li>Disciplinary fair-play points (not tracked here)</li>
                      <li>Drawing of lots (shown as "lot" badge)</li>
                    </ol>
                  </div>
                  <div>
                    <p className="font-medium text-foreground mb-1">
                      {t('groupBracket.fifaRulesPlacement', 'Placement constraints')}
                    </p>
                    <ul className="list-disc pl-5 space-y-0.5">
                      <li>The 8 R32 slots for third-placed teams have predefined eligible groups (e.g. <code>3rd ABCDF</code>).</li>
                      <li>
                        A team's group origin must be in the slot's eligible-groups list.
                      </li>
                      <li>
                        No team can face the winner of its own group in the Round of 32.
                      </li>
                      <li>
                        Same-group opponents cannot meet again until the Final.
                      </li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}