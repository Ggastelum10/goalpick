import { useMemo, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CalendarClock,
  Edit3,
  RefreshCw,
  Search,
  Wand2,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MatchTime } from '@/components/MatchTime';
import { cn } from '@/lib/utils';

import { useMatches, useUpdateMatch, type Match } from '@/hooks/useMatches';
import { supabase } from '@/integrations/supabase/client';
import { buildKnockoutBracket } from '@/lib/knockoutBracketResolver';
import { extractMatchNumber, getStageLabel, parseTeamSource } from '@/lib/fifaBracketPairings';
import { formatTournamentLong } from '@/lib/tournamentTime';

type Stage = Match['stage'];
type Status = NonNullable<Match['status']>;

const STAGE_OPTIONS: { value: Stage; label: string }[] = [
  { value: 'group', label: 'Group Stage' },
  { value: 'round_of_32', label: 'Round of 32' },
  { value: 'round_of_16', label: 'Round of 16' },
  { value: 'quarter_final', label: 'Quarter Finals' },
  { value: 'semi_final', label: 'Semi Finals' },
  { value: 'third_place', label: '3rd Place' },
  { value: 'final', label: 'Final' },
];

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'live', label: 'Live' },
  { value: 'finished', label: 'Finished' },
  { value: 'postponed', label: 'Postponed' },
];

function stageShort(stage: Stage): string {
  switch (stage) {
    case 'group':
      return 'Group';
    case 'round_of_32':
      return 'R32';
    case 'round_of_16':
      return 'R16';
    case 'quarter_final':
      return 'QF';
    case 'semi_final':
      return 'SF';
    case 'third_place':
      return '3rd';
    case 'final':
      return 'Final';
    default:
      return stage;
  }
}

function statusBadgeClasses(status: Status | null | undefined): string {
  switch (status) {
    case 'live':
      return 'bg-destructive/10 text-destructive border-destructive/30';
    case 'finished':
      return 'bg-success/10 text-success border-success/30';
    case 'postponed':
      return 'bg-warning/10 text-warning border-warning/30';
    case 'scheduled':
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

/** True when a stored team string is a placeholder like "Winner Group A", "Winner Match 75", "1A". */
function isPlaceholderTeam(teamStr: string | null | undefined): boolean {
  if (!teamStr) return true;
  return parseTeamSource(teamStr) !== null;
}

/** Convert a UTC ISO string into the value expected by `<input type="datetime-local">` (local TZ). */
function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

/** Reverse: take a datetime-local value (local TZ) → ISO UTC. */
function datetimeLocalToIso(value: string): string {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

/**
 * Compute a per-stage match number label.
 * - For knockouts, prefer the official FIFA match number derived from external_id.
 * - Group stage uses sequential M1..M72 by date order.
 */
function buildMatchNumbers(matches: Match[]): Map<string, number> {
  const result = new Map<string, number>();
  const groups = matches
    .filter((m) => m.stage === 'group')
    .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime());
  groups.forEach((m, idx) => result.set(m.id, idx + 1));
  for (const m of matches) {
    if (m.stage === 'group') continue;
    const n = extractMatchNumber(m.external_id);
    if (n > 0) result.set(m.id, n);
  }
  return result;
}

interface EditFormState {
  home_team: string;
  away_team: string;
  home_team_flag: string;
  away_team_flag: string;
  match_date: string; // datetime-local
  venue: string;
  city: string;
  stage: Stage;
  group_name: string;
  home_score: string;
  away_score: string;
  status: Status;
}

function emptyForm(match: Match): EditFormState {
  return {
    home_team: match.home_team ?? '',
    away_team: match.away_team ?? '',
    home_team_flag: match.home_team_flag ?? '',
    away_team_flag: match.away_team_flag ?? '',
    match_date: isoToDatetimeLocal(match.match_date),
    venue: match.venue ?? '',
    city: match.city ?? '',
    stage: match.stage,
    group_name: match.group_name ?? '',
    home_score: match.home_score === null || match.home_score === undefined ? '' : String(match.home_score),
    away_score: match.away_score === null || match.away_score === undefined ? '' : String(match.away_score),
    status: (match.status ?? 'scheduled') as Status,
  };
}

export function AdminMatches() {
  const { data: matches, isLoading, refetch, isFetching } = useMatches();
  const updateMatch = useUpdateMatch();
  const queryClient = useQueryClient();

  const [stageFilter, setStageFilter] = useState<'all' | Stage>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all');
  const [groupFilter, setGroupFilter] = useState<'all' | string>('all');
  const [search, setSearch] = useState('');

  const [editing, setEditing] = useState<Match | null>(null);
  const [form, setForm] = useState<EditFormState | null>(null);

  const [confirmApplyOpen, setConfirmApplyOpen] = useState(false);
  const [applying, setApplying] = useState(false);

  // Resolve the live bracket so we can preview real team names in placeholder rows.
  const bracket = useMemo(() => {
    if (!matches) return null;
    // Use Phase-by-Phase mode so the resolver advances winners using REAL finished
    // results without depending on any user's predictions.
    return buildKnockoutBracket(matches, [], undefined, undefined, 'update_every_stage');
  }, [matches]);

  const resolvedByMatchId = useMemo(() => {
    const map = new Map<
      string,
      { home: { name: string; flag: string | null } | null; away: { name: string; flag: string | null } | null }
    >();
    if (!bracket) return map;
    const stages = [
      bracket.round_of_32,
      bracket.round_of_16,
      bracket.quarter_final,
      bracket.semi_final,
      bracket.third_place,
      bracket.final,
    ];
    for (const stageMatches of stages) {
      for (const m of stageMatches) {
        map.set(m.matchId, {
          home: m.homeTeam ? { name: m.homeTeam.name, flag: m.homeTeam.flag } : null,
          away: m.awayTeam ? { name: m.awayTeam.name, flag: m.awayTeam.flag } : null,
        });
      }
    }
    return map;
  }, [bracket]);

  const matchNumbers = useMemo(() => buildMatchNumbers(matches ?? []), [matches]);

  const groupOptions = useMemo(() => {
    const set = new Set<string>();
    (matches ?? []).forEach((m) => {
      if (m.stage === 'group' && m.group_name) set.add(m.group_name);
    });
    return Array.from(set).sort();
  }, [matches]);

  const filtered = useMemo(() => {
    let list = matches ?? [];
    if (stageFilter !== 'all') list = list.filter((m) => m.stage === stageFilter);
    if (statusFilter !== 'all') list = list.filter((m) => (m.status ?? 'scheduled') === statusFilter);
    if (groupFilter !== 'all') list = list.filter((m) => m.group_name === groupFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((m) => {
        return [
          m.home_team,
          m.away_team,
          m.venue,
          m.city,
          m.external_id,
          m.group_name,
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));
      });
    }
    return [...list].sort(
      (a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime(),
    );
  }, [matches, stageFilter, statusFilter, groupFilter, search]);

  const placeholderCount = useMemo(() => {
    return (matches ?? []).filter(
      (m) =>
        m.stage !== 'group' && (isPlaceholderTeam(m.home_team) || isPlaceholderTeam(m.away_team)),
    ).length;
  }, [matches]);

  const openEdit = (match: Match) => {
    setEditing(match);
    setForm(emptyForm(match));
  };

  const closeEdit = () => {
    setEditing(null);
    setForm(null);
  };

  const handleSave = async () => {
    if (!editing || !form) return;
    const iso = datetimeLocalToIso(form.match_date);
    if (!iso) {
      toast.error('Invalid match date');
      return;
    }
    const homeScore = form.home_score === '' ? null : Number(form.home_score);
    const awayScore = form.away_score === '' ? null : Number(form.away_score);
    if ((form.home_score !== '' && Number.isNaN(homeScore!)) || (form.away_score !== '' && Number.isNaN(awayScore!))) {
      toast.error('Scores must be numbers');
      return;
    }

    try {
      await updateMatch.mutateAsync({
        matchId: editing.id,
        updates: {
          home_team: form.home_team.trim(),
          away_team: form.away_team.trim(),
          home_team_flag: form.home_team_flag.trim() || null,
          away_team_flag: form.away_team_flag.trim() || null,
          match_date: iso,
          venue: form.venue.trim() || null,
          city: form.city.trim() || null,
          stage: form.stage,
          group_name: form.stage === 'group' ? (form.group_name.trim() || null) : null,
          home_score: homeScore,
          away_score: awayScore,
          status: form.status,
        },
      });
      toast.success('Match updated');
      closeEdit();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update match');
    }
  };

  const handleApplyResolved = async () => {
    if (!matches || !bracket) return;
    setApplying(true);
    try {
      const updates: Promise<unknown>[] = [];
      let count = 0;
      for (const m of matches) {
        if (m.stage === 'group') continue;
        const resolved = resolvedByMatchId.get(m.id);
        if (!resolved) continue;
        const patch: Record<string, unknown> = {};
        if (isPlaceholderTeam(m.home_team) && resolved.home) {
          patch.home_team = resolved.home.name;
          if (resolved.home.flag) patch.home_team_flag = resolved.home.flag;
        }
        if (isPlaceholderTeam(m.away_team) && resolved.away) {
          patch.away_team = resolved.away.name;
          if (resolved.away.flag) patch.away_team_flag = resolved.away.flag;
        }
        if (Object.keys(patch).length > 0) {
          count++;
          updates.push(Promise.resolve(supabase.from('matches').update(patch).eq('id', m.id)));
        }
      }
      if (count === 0) {
        toast.info('No resolvable placeholder slots found');
      } else {
        await Promise.all(updates);
        await queryClient.invalidateQueries({ queryKey: ['matches'] });
        toast.success(`Applied resolved teams to ${count} matches`);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to apply resolved teams');
    } finally {
      setApplying(false);
      setConfirmApplyOpen(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5" /> Tournament Matches
        </CardTitle>
        <CardDescription>
          Edit any match's teams, kickoff time, venue, score, or status. Changes immediately reflect across the
          app and trigger automatic prediction scoring when status flips to <span className="font-mono">finished</span>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filter bar */}
        <div className="sticky top-0 z-10 -mx-6 px-6 py-3 bg-background/95 backdrop-blur border-b border-border">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="match-search" className="text-xs">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="match-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Team, venue, city, external id..."
                  className="pl-8"
                />
              </div>
            </div>

            <div className="w-[140px]">
              <Label className="text-xs">Stage</Label>
              <Select value={stageFilter} onValueChange={(v) => setStageFilter(v as 'all' | Stage)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All stages</SelectItem>
                  {STAGE_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[140px]">
              <Label className="text-xs">Status</Label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | Status)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(stageFilter === 'all' || stageFilter === 'group') && (
              <div className="w-[120px]">
                <Label className="text-xs">Group</Label>
                <Select value={groupFilter} onValueChange={(v) => setGroupFilter(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All groups</SelectItem>
                    {groupOptions.map((g) => (
                      <SelectItem key={g} value={g}>Group {g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmApplyOpen(true)}
                disabled={!bracket || placeholderCount === 0 || applying}
                className="gap-1"
              >
                <Wand2 className="h-4 w-4" />
                Apply resolved teams
                {placeholderCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                    {placeholderCount}
                  </Badge>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                className="gap-1"
              >
                <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
                Refresh
              </Button>
            </div>
          </div>

          <p className="mt-2 text-xs text-muted-foreground">
            Showing <span className="font-medium text-foreground">{filtered.length}</span> of {matches?.length ?? 0} matches
          </p>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-10">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">No matches found</p>
        ) : (
          <TooltipProvider delayDuration={150}>
            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">#</TableHead>
                    <TableHead className="w-[120px]">Stage</TableHead>
                    <TableHead className="w-[140px]">Kickoff</TableHead>
                    <TableHead>Home</TableHead>
                    <TableHead className="w-[80px] text-center">Score</TableHead>
                    <TableHead>Away</TableHead>
                    <TableHead className="w-[180px]">Venue</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[80px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((m) => {
                    const num = matchNumbers.get(m.id);
                    const resolved = resolvedByMatchId.get(m.id);
                    const homePlaceholder = isPlaceholderTeam(m.home_team);
                    const awayPlaceholder = isPlaceholderTeam(m.away_team);
                    const homeDisplay = homePlaceholder && resolved?.home ? resolved.home.name : m.home_team;
                    const awayDisplay = awayPlaceholder && resolved?.away ? resolved.away.name : m.away_team;
                    const homeFlag = homePlaceholder && resolved?.home?.flag ? resolved.home.flag : m.home_team_flag;
                    const awayFlag = awayPlaceholder && resolved?.away?.flag ? resolved.away.flag : m.away_team_flag;
                    const isTbd = (homePlaceholder && !resolved?.home) || (awayPlaceholder && !resolved?.away);
                    return (
                      <TableRow key={m.id} className={cn(isTbd && 'opacity-70')}>
                        <TableCell className="font-mono text-xs">M{num ?? '–'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] px-1.5">
                            {stageShort(m.stage)}
                            {m.group_name && m.stage === 'group' ? ` ${m.group_name}` : ''}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          <MatchTime date={m.match_date} variant="date-time" />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {homeFlag && <span className="text-base leading-none">{homeFlag}</span>}
                            <span className={cn('truncate', homePlaceholder && resolved?.home && 'italic')}>
                              {homePlaceholder && resolved?.home ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-help underline-offset-2 decoration-dotted hover:underline">
                                      {homeDisplay}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="text-xs">
                                    Auto-resolved from results.<br />
                                    Stored: <span className="font-mono">{m.home_team}</span>
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                homeDisplay
                              )}
                            </span>
                            {homePlaceholder && !resolved?.home && (
                              <Badge variant="outline" className="text-[9px] h-4 px-1 border-dashed">TBD</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-mono text-sm">
                          {m.home_score !== null && m.away_score !== null
                            ? `${m.home_score} – ${m.away_score}`
                            : '–'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {awayFlag && <span className="text-base leading-none">{awayFlag}</span>}
                            <span className={cn('truncate', awayPlaceholder && resolved?.away && 'italic')}>
                              {awayPlaceholder && resolved?.away ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-help underline-offset-2 decoration-dotted hover:underline">
                                      {awayDisplay}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="text-xs">
                                    Auto-resolved from results.<br />
                                    Stored: <span className="font-mono">{m.away_team}</span>
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                awayDisplay
                              )}
                            </span>
                            {awayPlaceholder && !resolved?.away && (
                              <Badge variant="outline" className="text-[9px] h-4 px-1 border-dashed">TBD</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {m.venue ? (
                            <span className="truncate block">
                              {m.venue}
                              {m.city ? `, ${m.city}` : ''}
                            </span>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('text-[10px] capitalize', statusBadgeClasses(m.status))}>
                            {m.status ?? 'scheduled'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(m)} className="h-7 px-2">
                            <Edit3 className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-2">
              {filtered.map((m) => {
                const num = matchNumbers.get(m.id);
                const resolved = resolvedByMatchId.get(m.id);
                const homePlaceholder = isPlaceholderTeam(m.home_team);
                const awayPlaceholder = isPlaceholderTeam(m.away_team);
                const homeDisplay = homePlaceholder && resolved?.home ? resolved.home.name : m.home_team;
                const awayDisplay = awayPlaceholder && resolved?.away ? resolved.away.name : m.away_team;
                const homeFlag = homePlaceholder && resolved?.home?.flag ? resolved.home.flag : m.home_team_flag;
                const awayFlag = awayPlaceholder && resolved?.away?.flag ? resolved.away.flag : m.away_team_flag;
                return (
                  <div key={m.id} className="rounded-lg border p-3 space-y-2 bg-card">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">M{num ?? '–'}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {stageShort(m.stage)}
                          {m.group_name && m.stage === 'group' ? ` ${m.group_name}` : ''}
                        </Badge>
                        <Badge variant="outline" className={cn('text-[10px] capitalize', statusBadgeClasses(m.status))}>
                          {m.status ?? 'scheduled'}
                        </Badge>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(m)} className="h-7 px-2">
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <MatchTime date={m.match_date} variant="long" />
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="flex-1 flex items-center gap-1.5 truncate">
                        {homeFlag && <span>{homeFlag}</span>}
                        <span className={cn(homePlaceholder && resolved?.home && 'italic')}>{homeDisplay}</span>
                      </span>
                      <span className="font-mono px-2">
                        {m.home_score !== null && m.away_score !== null ? `${m.home_score}–${m.away_score}` : '–'}
                      </span>
                      <span className="flex-1 flex items-center gap-1.5 truncate justify-end">
                        <span className={cn(awayPlaceholder && resolved?.away && 'italic')}>{awayDisplay}</span>
                        {awayFlag && <span>{awayFlag}</span>}
                      </span>
                    </div>
                    {m.venue && (
                      <p className="text-[10px] text-muted-foreground truncate">
                        {m.venue}{m.city ? `, ${m.city}` : ''}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </TooltipProvider>
        )}
      </CardContent>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit match
              {editing && (
                <span className="font-mono text-xs text-muted-foreground ml-2">
                  M{matchNumbers.get(editing.id) ?? '–'} · {getStageLabel(editing.stage as any) || stageShort(editing.stage)}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              Changes save immediately. Setting status to <span className="font-mono">finished</span> with scores
              automatically calculates prediction points.
            </DialogDescription>
          </DialogHeader>

          {form && editing && (
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Home team</Label>
                  <Input value={form.home_team} onChange={(e) => setForm({ ...form, home_team: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Home flag (emoji or URL)</Label>
                  <Input
                    value={form.home_team_flag}
                    onChange={(e) => setForm({ ...form, home_team_flag: e.target.value })}
                    placeholder="🇲🇽"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Away team</Label>
                  <Input value={form.away_team} onChange={(e) => setForm({ ...form, away_team: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Away flag (emoji or URL)</Label>
                  <Input
                    value={form.away_team_flag}
                    onChange={(e) => setForm({ ...form, away_team_flag: e.target.value })}
                    placeholder="🇨🇦"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Match date / time (your local time)</Label>
                  <Input
                    type="datetime-local"
                    value={form.match_date}
                    onChange={(e) => setForm({ ...form, match_date: e.target.value })}
                  />
                  {form.match_date && (
                    <p className="text-[10px] text-muted-foreground">
                      Tournament time: {formatTournamentLong(datetimeLocalToIso(form.match_date) || editing.match_date)}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Status })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Stage</Label>
                  <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v as Stage })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGE_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Group (group stage only)</Label>
                  <Input
                    value={form.group_name}
                    onChange={(e) => setForm({ ...form, group_name: e.target.value })}
                    disabled={form.stage !== 'group'}
                    placeholder="A"
                    maxLength={2}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">External ID (read only)</Label>
                  <Input value={editing.external_id ?? ''} readOnly disabled className="font-mono text-xs" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Venue</Label>
                  <Input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">City</Label>
                  <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Home score</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.home_score}
                    onChange={(e) => setForm({ ...form, home_score: e.target.value })}
                    placeholder="—"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Away score</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.away_score}
                    onChange={(e) => setForm({ ...form, away_score: e.target.value })}
                    placeholder="—"
                  />
                </div>
              </div>

              {form.status === 'finished' && (form.home_score === '' || form.away_score === '') && (
                <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-2 text-xs">
                  <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
                  <span>Status is "finished" but scores are missing. Prediction scoring will not run until both scores are set.</span>
                </div>
              )}
              {form.status === 'finished' && form.home_score !== '' && form.away_score !== '' && (
                <div className="flex items-start gap-2 rounded-md border border-success/40 bg-success/10 p-2 text-xs">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5" />
                  <span>Saving will mark this match finished and recalculate prediction points across all leagues.</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={closeEdit} disabled={updateMatch.isPending}>Cancel</Button>
            <Button onClick={handleSave} disabled={updateMatch.isPending}>
              {updateMatch.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Saving...
                </>
              ) : (
                'Save changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Apply resolved confirmation */}
      <AlertDialog open={confirmApplyOpen} onOpenChange={setConfirmApplyOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply resolved teams?</AlertDialogTitle>
            <AlertDialogDescription>
              This will overwrite placeholder team strings (e.g. <span className="font-mono">Winner Group A</span>,{' '}
              <span className="font-mono">Winner Match 75</span>) on knockout matches whose predecessors have finished,
              writing real team names directly into the database. Matches whose predecessors are not yet finished are skipped.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={applying}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApplyResolved} disabled={applying}>
              {applying ? 'Applying...' : 'Apply'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export default AdminMatches;