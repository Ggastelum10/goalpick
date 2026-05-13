import { useState, useMemo, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useMatches } from '@/hooks/useMatches';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  RefreshCw, Activity, Heart, Zap, Plus, Trash2, Play, Pause, Square,
  CheckCircle, AlertTriangle, Clock, Radio, Globe, Download, DownloadCloud,
  ChevronDown, History, Trophy, Target, X
} from 'lucide-react';

type MatchStatus = 'scheduled' | 'live' | 'finished' | 'postponed';

interface TimelineEntry {
  time: Date;
  home: number;
  away: number;
  status: string;
}
interface LiveFixture {
  external_id: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  league_name: string;
  league_id: number;
  minute: number | null;
  state: string;
  starting_at: string;
}

export function SportMonksLiveTester() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: allMatches } = useMatches();

  // --- Health Check state ---
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthResult, setHealthResult] = useState<any>(null);

  // --- Sync Test state ---
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  // --- Live Simulation state ---
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [simHomeScore, setSimHomeScore] = useState('0');
  const [simAwayScore, setSimAwayScore] = useState('0');
  const [simLoading, setSimLoading] = useState(false);
  const [simPolling, setSimPolling] = useState(false);
  const [simPollInterval, setSimPollInterval] = useState('10');

  // --- Match Injection state ---
  const [injectHome, setInjectHome] = useState('');
  const [injectAway, setInjectAway] = useState('');
  const [injectLoading, setInjectLoading] = useState(false);

  // --- Polling state ---
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const [pollingInterval, setPollingInterval] = useState('30');

  // --- Live Games state ---
  const [liveFixtures, setLiveFixtures] = useState<LiveFixture[]>([]);
  const [fetchingLive, setFetchingLive] = useState(false);
  const [liveAutoRefresh, setLiveAutoRefresh] = useState(false);
  const [liveRefreshInterval, setLiveRefreshInterval] = useState('60');
  const [importingIds, setImportingIds] = useState<Set<string>>(new Set());
  const [liveMode, setLiveMode] = useState<'inplay' | 'date'>('date');
  const [liveDate, setLiveDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [liveTeamFilter, setLiveTeamFilter] = useState('');

  // --- Test Prediction state ---
  const [predLeagueId, setPredLeagueId] = useState<string>('solo');
  const [predHome, setPredHome] = useState('2');
  const [predAway, setPredAway] = useState('1');
  const [predSaving, setPredSaving] = useState(false);
  const [scoringResults, setScoringResults] = useState<any[] | null>(null);

  // Fetch user's leagues for the prediction form
  const { data: userLeagues } = useQuery({
    queryKey: ['admin-user-leagues', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('league_members')
        .select('league_id, leagues(id, name, is_test, prediction_mode, exact_score_points, outcome_points)')
        .eq('user_id', user.id);
      if (error) throw error;
      return data?.map(d => (d as any).leagues).filter(Boolean) || [];
    },
    enabled: !!user,
  });

  // Fetch existing prediction for selected match + league
  const { data: existingPred, refetch: refetchPred } = useQuery({
    queryKey: ['admin-test-pred', selectedMatchId, predLeagueId, user?.id],
    queryFn: async () => {
      if (!user || !selectedMatchId) return null;
      let q = supabase
        .from('predictions')
        .select('*')
        .eq('user_id', user.id)
        .eq('match_id', selectedMatchId);
      if (predLeagueId === 'solo') {
        q = q.is('league_id', null);
      } else {
        q = q.eq('league_id', predLeagueId);
      }
      const { data, error } = await q.maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!selectedMatchId,
  });

  // Detect stale test matches
  const staleTestMatches = useMemo(() => {
    if (!allMatches) return [];
    const now = new Date();
    return allMatches.filter(m =>
      (m.group_name === 'TEST' || m.group_name === 'LIVE_TEST') &&
      m.status === 'scheduled' &&
      new Date(m.match_date) <= now
    );
  }, [allMatches]);

  // Save test prediction
  const handleSavePrediction = async () => {
    if (!user || !selectedMatchId) return;
    setPredSaving(true);
    try {
      const leagueId = predLeagueId === 'solo' ? null : predLeagueId;
      const homeScore = parseInt(predHome);
      const awayScore = parseInt(predAway);

      // Check if exists
      let q = supabase
        .from('predictions')
        .select('id')
        .eq('user_id', user.id)
        .eq('match_id', selectedMatchId);
      if (leagueId) {
        q = q.eq('league_id', leagueId);
      } else {
        q = q.is('league_id', null);
      }
      const { data: existing } = await q.maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('predictions')
          .update({ predicted_home_score: homeScore, predicted_away_score: awayScore })
          .eq('id', existing.id);
        if (error) throw error;
        toast.success('Prediction updated');
      } else {
        const { error } = await supabase
          .from('predictions')
          .insert({
            user_id: user.id,
            match_id: selectedMatchId,
            predicted_home_score: homeScore,
            predicted_away_score: awayScore,
            league_id: leagueId,
          });
        if (error) throw error;
        toast.success('Prediction saved');
      }
      refetchPred();
    } catch (err: any) {
      toast.error(`Prediction error: ${err.message}`);
    } finally {
      setPredSaving(false);
    }
  };

  // Fetch scoring results after finishing
  const fetchScoringResults = async (matchId: string) => {
    const { data, error } = await supabase
      .from('predictions')
      .select('*, profiles:user_id(display_name)')
      .eq('match_id', matchId);
    if (error) {
      console.error('Failed to fetch scoring results', error);
      return;
    }
    setScoringResults(data);
  };

  const timelineRef = useRef<Map<string, TimelineEntry[]>>(new Map());
  const [timelineVersion, setTimelineVersion] = useState(0);

  // Live matches monitor with polling
  const { data: liveMatches } = useQuery({
    queryKey: ['live-matches-monitor'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('status', 'live')
        .order('match_date', { ascending: true });
      if (error) throw error;
      return data;
    },
    refetchInterval: pollingEnabled ? parseInt(pollingInterval) * 1000 : false,
  });

  // Track score changes in timeline
  useEffect(() => {
    if (!liveMatches) return;
    let changed = false;
    for (const m of liveMatches) {
      const entries = timelineRef.current.get(m.id) || [];
      const last = entries[entries.length - 1];
      const home = m.home_score ?? 0;
      const away = m.away_score ?? 0;
      const status = m.status ?? 'live';
      if (!last || last.home !== home || last.away !== away || last.status !== status) {
        entries.push({ time: new Date(), home, away, status });
        timelineRef.current.set(m.id, entries);
        changed = true;
      }
    }
    if (changed) setTimelineVersion(v => v + 1);
  }, [liveMatches]);

  const clearTimeline = () => {
    timelineRef.current.clear();
    setTimelineVersion(v => v + 1);
  };

  // Auto-refresh live fixtures from SportMonks
  useQuery({
    queryKey: ['live-fixtures-auto'],
    queryFn: async () => {
      await fetchLiveFixtures(true);
      return null;
    },
    refetchInterval: liveAutoRefresh ? parseInt(liveRefreshInterval) * 1000 : false,
    enabled: liveAutoRefresh,
  });
  // Auto-poll selected match for simulation tab
  const { data: polledMatch } = useQuery({
    queryKey: ['sim-match-poll', selectedMatchId],
    queryFn: async () => {
      if (!selectedMatchId) return null;
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('id', selectedMatchId)
        .single();
      if (error) throw error;
      return data;
    },
    refetchInterval: simPolling && selectedMatchId ? parseInt(simPollInterval) * 1000 : false,
    enabled: !!selectedMatchId,
  });

  const selectedMatch = polledMatch ?? allMatches?.find(m => m.id === selectedMatchId) ?? null;

  const importedExternalIds = useMemo(() => {
    if (!allMatches) return new Set<string>();
    return new Set(
      allMatches
        .filter(m => m.group_name === 'LIVE_TEST' && m.external_id)
        .map(m => m.external_id!)
    );
  }, [allMatches]);

  // ========== Health Check ==========
  const handleHealthCheck = async () => {
    setHealthLoading(true);
    setHealthResult(null);
    try {
      const start = Date.now();
      const { data, error } = await supabase.functions.invoke('sync-matches', {
        body: { dryRun: true },
      });
      const elapsed = Date.now() - start;
      if (error) throw error;
      setHealthResult({ ...data, responseTimeMs: elapsed });
    } catch (err: any) {
      setHealthResult({ success: false, error: err.message });
    } finally {
      setHealthLoading(false);
    }
  };

  // ========== Full Sync Test ==========
  const handleSyncTest = async () => {
    setSyncLoading(true);
    setSyncResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('sync-matches');
      if (error) throw error;
      setSyncResult(data);
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    } catch (err: any) {
      setSyncResult({ success: false, error: err.message });
    } finally {
      setSyncLoading(false);
    }
  };

  // ========== Status Cycling ==========
  const updateMatchStatus = async (status: MatchStatus, homeScore?: number | null, awayScore?: number | null) => {
    if (!selectedMatchId) return;
    setSimLoading(true);
    try {
      const updates: Record<string, any> = { status };
      if (homeScore !== undefined) updates.home_score = homeScore;
      if (awayScore !== undefined) updates.away_score = awayScore;

      const { error } = await supabase
        .from('matches')
        .update(updates)
        .eq('id', selectedMatchId);
      if (error) throw error;
      toast.success(`Match set to "${status}"`);
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['live-matches-monitor'] });

      // After finishing, fetch scoring results
      if (status === 'finished') {
        // Small delay for the trigger to run
        setTimeout(() => {
          fetchScoringResults(selectedMatchId);
          refetchPred();
        }, 1500);
      } else {
        setScoringResults(null);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSimLoading(false);
    }
  };

  // ========== Match Injection ==========
  const handleInjectMatch = async () => {
    if (!injectHome || !injectAway) {
      toast.error('Enter both team names');
      return;
    }
    setInjectLoading(true);
    try {
      const { error } = await supabase.from('matches').insert({
        home_team: injectHome,
        away_team: injectAway,
        match_date: new Date(Date.now() + 3600000).toISOString(),
        stage: 'group' as const,
        group_name: 'TEST',
        status: 'scheduled' as const,
      });
      if (error) throw error;
      toast.success('Test match created');
      setInjectHome('');
      setInjectAway('');
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setInjectLoading(false);
    }
  };

  // ========== Delete test matches ==========
  // We must first remove any rows in test_matches that reference these
  // matches via source_match_id, otherwise the FK blocks the delete with:
  //   update or delete on table "matches" violates foreign key constraint
  //   "test_matches_source_match_id_fkey" on table "test_matches"
  const handleDeleteTestMatches = async () => {
    try {
      // 1) Find the matches we want to delete
      const { data: targets, error: fetchErr } = await supabase
        .from('matches')
        .select('id')
        .in('group_name', ['TEST', 'LIVE_TEST']);
      if (fetchErr) throw fetchErr;

      const ids = (targets ?? []).map((m) => m.id);

      // 2) Detach test_matches first (admin RLS allows this)
      if (ids.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: tmErr } = await (supabase as any)
          .from('test_matches')
          .delete()
          .in('source_match_id', ids);
        if (tmErr) throw tmErr;
      }

      // 3) Now delete the matches themselves
      const { error: e1 } = await supabase
        .from('matches')
        .delete()
        .eq('group_name', 'TEST');
      const { error: e2 } = await supabase
        .from('matches')
        .delete()
        .eq('group_name', 'LIVE_TEST');
      if (e1) throw e1;
      if (e2) throw e2;

      toast.success('Test matches deleted');
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // ========== Fetch Live Fixtures from SportMonks ==========
  const fetchLiveFixtures = async (silent = false) => {
    if (!silent) setFetchingLive(true);
    try {
      const body: Record<string, string> = { mode: liveMode };
      if (liveMode === 'date') body.date = liveDate;
      const { data, error } = await supabase.functions.invoke('fetch-live-fixtures', { body });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to fetch');
      setLiveFixtures(data.fixtures || []);
      if (!silent) toast.success(`Found ${data.count} fixture(s)`);

      // Auto-update imported matches
      if (data.fixtures?.length > 0 && allMatches) {
        const imported = allMatches.filter(m => m.group_name === 'LIVE_TEST' && m.external_id);
        for (const match of imported) {
          const fixture = data.fixtures.find((f: LiveFixture) => f.external_id === match.external_id);
          if (fixture && (fixture.home_score !== match.home_score || fixture.away_score !== match.away_score)) {
            await supabase.from('matches').update({
              home_score: fixture.home_score,
              away_score: fixture.away_score,
              status: 'live' as const,
            }).eq('id', match.id);
          }
        }
        queryClient.invalidateQueries({ queryKey: ['matches'] });
        queryClient.invalidateQueries({ queryKey: ['live-matches-monitor'] });
      }
    } catch (err: any) {
      if (!silent) toast.error(err.message);
    } finally {
      if (!silent) setFetchingLive(false);
    }
  };

  // Filtered fixtures by team name
  const filteredFixtures = useMemo(() => {
    if (!liveTeamFilter.trim()) return liveFixtures;
    const q = liveTeamFilter.toLowerCase();
    return liveFixtures.filter(f =>
      f.home_team.toLowerCase().includes(q) ||
      f.away_team.toLowerCase().includes(q) ||
      f.league_name.toLowerCase().includes(q)
    );
  }, [liveFixtures, liveTeamFilter]);

  // ========== Import a single fixture ==========
  const handleImportFixture = async (fixture: LiveFixture) => {
    setImportingIds(prev => new Set(prev).add(fixture.external_id));
    try {
      const { error } = await supabase.from('matches').insert({
        home_team: fixture.home_team,
        away_team: fixture.away_team,
        home_score: fixture.home_score,
        away_score: fixture.away_score,
        match_date: fixture.starting_at || new Date().toISOString(),
        stage: 'group' as const,
        group_name: 'LIVE_TEST',
        status: 'live' as const,
        external_id: fixture.external_id,
      });
      if (error) throw error;
      toast.success(`Imported ${fixture.home_team} vs ${fixture.away_team}`);
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setImportingIds(prev => {
        const next = new Set(prev);
        next.delete(fixture.external_id);
        return next;
      });
    }
  };

  // ========== Import all fixtures ==========
  const handleImportAll = async () => {
    const toImport = liveFixtures.filter(f => !importedExternalIds.has(f.external_id));
    if (toImport.length === 0) {
      toast.info('All fixtures already imported');
      return;
    }
    for (const f of toImport) {
      await handleImportFixture(f);
    }
  };

  const testMatchCount = allMatches
    ? allMatches.filter(m => m.group_name === 'TEST' || m.group_name === 'LIVE_TEST').length
    : 0;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="health" className="space-y-4">
        <TabsList className="flex w-full overflow-x-auto scrollbar-hide">
          <TabsTrigger value="health" className="gap-1.5">
            <Heart className="h-4 w-4" /> Health Check
          </TabsTrigger>
          <TabsTrigger value="livegames" className="gap-1.5">
            <Globe className="h-4 w-4" /> Live Games
          </TabsTrigger>
          <TabsTrigger value="simulate" className="gap-1.5">
            <Zap className="h-4 w-4" /> Live Simulation
          </TabsTrigger>
          <TabsTrigger value="monitor" className="gap-1.5">
            <Radio className="h-4 w-4" /> Live Monitor
          </TabsTrigger>
          <TabsTrigger value="inject" className="gap-1.5">
            <Plus className="h-4 w-4" /> Inject Match
          </TabsTrigger>
        </TabsList>

        {/* =================== HEALTH CHECK =================== */}
        <TabsContent value="health" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Heart className="h-5 w-5" /> API Health Check
                </CardTitle>
                <CardDescription>
                  Verify SportMonks API token, available seasons, and response time without writing to the database.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={handleHealthCheck} disabled={healthLoading} className="w-full">
                  {healthLoading ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Checking...</> : 'Run Health Check (Dry Run)'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Activity className="h-5 w-5" /> Full Sync Test
                </CardTitle>
                <CardDescription>
                  Call sync-matches and write results to the database. Shows raw response.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleSyncTest} disabled={syncLoading} variant="outline" className="w-full">
                  {syncLoading ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Syncing...</> : 'Run Full Sync'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {healthResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  {healthResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  )}
                  Health Check Result
                  {healthResult.responseTimeMs && (
                    <Badge variant="outline" className="ml-auto">{healthResult.responseTimeMs}ms</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-72">
                  {JSON.stringify(healthResult, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          {syncResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  {syncResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  )}
                  Sync Result
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-72">
                  {JSON.stringify(syncResult, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* =================== LIVE GAMES =================== */}
        <TabsContent value="livegames" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Globe className="h-5 w-5" /> Live Games from SportMonks
              </CardTitle>
              <CardDescription>
                Fetch any currently live football matches worldwide. Import them as test matches to see how your app handles live score updates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mode toggle */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex rounded-md border overflow-hidden">
                  <Button
                    size="sm"
                    variant={liveMode === 'inplay' ? 'default' : 'ghost'}
                    className="rounded-none"
                    onClick={() => setLiveMode('inplay')}
                  >
                    <Radio className="mr-1 h-3 w-3" /> In-Play Only
                  </Button>
                  <Button
                    size="sm"
                    variant={liveMode === 'date' ? 'default' : 'ghost'}
                    className="rounded-none"
                    onClick={() => setLiveMode('date')}
                  >
                    <Clock className="mr-1 h-3 w-3" /> By Date
                  </Button>
                </div>

                {liveMode === 'date' && (
                  <Input
                    type="date"
                    className="w-44 h-8"
                    value={liveDate}
                    onChange={e => setLiveDate(e.target.value)}
                  />
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={() => fetchLiveFixtures()} disabled={fetchingLive}>
                  {fetchingLive
                    ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Fetching...</>
                    : <><Globe className="mr-2 h-4 w-4" /> Fetch {liveMode === 'inplay' ? 'Live' : 'By Date'}</>}
                </Button>

                <Button
                  size="sm"
                  variant={liveAutoRefresh ? 'destructive' : 'secondary'}
                  onClick={() => setLiveAutoRefresh(!liveAutoRefresh)}
                >
                  {liveAutoRefresh ? <><Pause className="mr-1 h-3 w-3" /> Stop Auto-Refresh</> : <><Play className="mr-1 h-3 w-3" /> Auto-Refresh</>}
                </Button>

                <div className="flex items-center gap-2">
                  <Label className="text-xs whitespace-nowrap">Interval (s)</Label>
                  <Input
                    type="number"
                    min="15"
                    className="w-20 h-8"
                    value={liveRefreshInterval}
                    onChange={e => setLiveRefreshInterval(e.target.value)}
                  />
                </div>

                {liveAutoRefresh && (
                  <Badge className="animate-pulse">Auto-refreshing every {liveRefreshInterval}s</Badge>
                )}
              </div>

              {/* Team name filter */}
              {liveFixtures.length > 0 && (
                <div className="flex items-center gap-3">
                  <Input
                    placeholder="Filter by team or league name..."
                    className="h-8"
                    value={liveTeamFilter}
                    onChange={e => setLiveTeamFilter(e.target.value)}
                  />
                  {liveTeamFilter && (
                    <Button size="sm" variant="ghost" onClick={() => setLiveTeamFilter('')}>
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}

              {liveFixtures.length > 0 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {filteredFixtures.length} of {liveFixtures.length} fixture(s) shown
                  </p>
                  <Button size="sm" variant="outline" onClick={handleImportAll}>
                    <DownloadCloud className="mr-1 h-3 w-3" /> Import All
                  </Button>
                </div>
              )}

              {filteredFixtures.length > 0 ? (
                <div className="space-y-2">
                  {filteredFixtures.map(fix => {
                    const alreadyImported = importedExternalIds.has(fix.external_id);
                    return (
                      <div key={fix.external_id} className="flex items-center justify-between p-3 rounded-md bg-muted/50 border">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{fix.home_team} vs {fix.away_team}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {fix.league_name} {fix.minute ? `• ${fix.minute}'` : ''} {fix.state ? `• ${fix.state}` : ''}
                          </p>
                        </div>
                        <div className="text-center mx-3">
                          <p className="text-lg font-bold">{fix.home_score} - {fix.away_score}</p>
                          <Badge variant="default" className="text-[10px]">{fix.state || 'SCHED'}</Badge>
                        </div>
                        <Button
                          size="sm"
                          variant={alreadyImported ? 'secondary' : 'outline'}
                          disabled={alreadyImported || importingIds.has(fix.external_id)}
                          onClick={() => handleImportFixture(fix)}
                        >
                          {alreadyImported ? (
                            <><CheckCircle className="mr-1 h-3 w-3" /> Imported</>
                          ) : importingIds.has(fix.external_id) ? (
                            <><RefreshCw className="mr-1 h-3 w-3 animate-spin" /> ...</>
                          ) : (
                            <><Download className="mr-1 h-3 w-3" /> Import</>
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : liveFixtures.length > 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No fixtures match your filter. Try a different team name.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No fixtures fetched yet. Click "Fetch" to load {liveMode === 'inplay' ? 'in-play matches' : `fixtures for ${liveDate}`}.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* =================== LIVE SIMULATION =================== */}
        <TabsContent value="simulate" className="space-y-4">
          {/* Stale test match warning */}
          {staleTestMatches.length > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-yellow-500/10 border border-yellow-500/30 text-sm">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Stale test matches detected</p>
                <p className="text-muted-foreground text-xs mt-1">
                  {staleTestMatches.length} test match(es) have past dates and status "scheduled". This makes <code>is_phase_started('group')</code> return true, 
                  blocking predictions in update_every_stage leagues. Delete them in the "Inject Match" tab first.
                </p>
              </div>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="h-5 w-5" /> Live Score Simulation
              </CardTitle>
              <CardDescription>
                Select a match and cycle it through statuses with configurable scores.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Auto-poll controls */}
              <div className="flex flex-wrap items-center gap-3 p-3 rounded-md bg-muted/30 border">
                <Button
                  size="sm"
                  variant={simPolling ? 'destructive' : 'secondary'}
                  onClick={() => setSimPolling(!simPolling)}
                >
                  {simPolling ? <><Pause className="mr-1 h-3 w-3" /> Stop Auto-Poll</> : <><RefreshCw className="mr-1 h-3 w-3" /> Auto-Poll</>}
                </Button>
                <div className="flex items-center gap-2">
                  <Label className="text-xs whitespace-nowrap">Every (s)</Label>
                  <Input
                    type="number"
                    min="5"
                    className="w-20 h-8"
                    value={simPollInterval}
                    onChange={e => setSimPollInterval(e.target.value)}
                  />
                </div>
                {simPolling && selectedMatchId && (
                  <Badge className="animate-pulse">Auto-refreshing every {simPollInterval}s</Badge>
                )}
              </div>
              <div>
                <Label>Select Match</Label>
                <Select value={selectedMatchId} onValueChange={(v) => { setSelectedMatchId(v); setScoringResults(null); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a match..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allMatches?.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        <span className="flex items-center gap-2">
                          {m.home_team} vs {m.away_team}
                          <Badge variant="outline" className="text-[10px]">{m.status}</Badge>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedMatch && (
                <>
                  <div className="p-3 rounded-md bg-muted/50 text-sm space-y-1">
                    <p><strong>{selectedMatch.home_team}</strong> vs <strong>{selectedMatch.away_team}</strong></p>
                    <p className="text-muted-foreground">
                      Status: <Badge variant={selectedMatch.status === 'live' ? 'default' : 'outline'}>{selectedMatch.status}</Badge>
                      {' | '}Score: {selectedMatch.home_score ?? '-'} - {selectedMatch.away_score ?? '-'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Home Score</Label>
                      <Input type="number" min="0" value={simHomeScore} onChange={e => setSimHomeScore(e.target.value)} />
                    </div>
                    <div>
                      <Label>Away Score</Label>
                      <Input type="number" min="0" value={simAwayScore} onChange={e => setSimAwayScore(e.target.value)} />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" disabled={simLoading} onClick={() => updateMatchStatus('scheduled', null, null)}>
                      <Clock className="mr-1 h-3 w-3" /> Scheduled
                    </Button>
                    <Button size="sm" disabled={simLoading} onClick={() => updateMatchStatus('live', parseInt(simHomeScore), parseInt(simAwayScore))}>
                      <Play className="mr-1 h-3 w-3" /> Go Live
                    </Button>
                    <Button size="sm" variant="secondary" disabled={simLoading} onClick={() => updateMatchStatus('live', parseInt(simHomeScore), parseInt(simAwayScore))}>
                      <Pause className="mr-1 h-3 w-3" /> Update Live Score
                    </Button>
                    <Button size="sm" variant="destructive" disabled={simLoading} onClick={() => updateMatchStatus('finished', parseInt(simHomeScore), parseInt(simAwayScore))}>
                      <Square className="mr-1 h-3 w-3" /> Finish
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* ===== INLINE PREDICTION FORM ===== */}
          {selectedMatch && selectedMatch.status === 'scheduled' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5" /> Insert Test Prediction
                </CardTitle>
                <CardDescription>
                  Save a prediction for this match before cycling it to finished.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>League</Label>
                  <Select value={predLeagueId} onValueChange={setPredLeagueId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solo">Solo (no league)</SelectItem>
                      {userLeagues?.map((l: any) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.name} {l.is_test ? '(test)' : ''} — {l.prediction_mode}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Predicted Home</Label>
                    <Input type="number" min="0" value={predHome} onChange={e => setPredHome(e.target.value)} />
                  </div>
                  <div>
                    <Label>Predicted Away</Label>
                    <Input type="number" min="0" value={predAway} onChange={e => setPredAway(e.target.value)} />
                  </div>
                </div>

                {existingPred && (
                  <div className="text-xs p-2 rounded bg-muted/50 border">
                    Existing prediction: <strong>{existingPred.predicted_home_score} - {existingPred.predicted_away_score}</strong>
                    {existingPred.points_earned != null && existingPred.points_earned > 0 && (
                      <span className="ml-2">→ {existingPred.points_earned} pts</span>
                    )}
                  </div>
                )}

                <Button onClick={handleSavePrediction} disabled={predSaving} className="w-full">
                  {predSaving ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Prediction'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ===== SCORING RESULTS ===== */}
          {scoringResults && scoringResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Trophy className="h-5 w-5" /> Scoring Results
                </CardTitle>
                <CardDescription>
                  Points awarded by the scoring trigger after match was finished.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {scoringResults.map((r: any) => {
                    const isExact = selectedMatch && r.predicted_home_score === selectedMatch.home_score && r.predicted_away_score === selectedMatch.away_score;
                    const predSign = Math.sign(r.predicted_home_score - r.predicted_away_score);
                    const actualSign = selectedMatch ? Math.sign((selectedMatch.home_score ?? 0) - (selectedMatch.away_score ?? 0)) : null;
                    const isOutcome = predSign === actualSign;
                    return (
                      <div key={r.id} className="flex items-center justify-between p-3 rounded-md bg-muted/50 border">
                        <div>
                          <p className="text-sm font-medium">{r.profiles?.display_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">
                            Predicted: {r.predicted_home_score} - {r.predicted_away_score}
                            {r.league_id ? ` (league)` : ' (solo)'}
                          </p>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <Badge variant={isExact ? 'default' : isOutcome ? 'secondary' : 'outline'}>
                            {isExact ? 'Exact' : isOutcome ? 'Outcome' : 'Miss'}
                          </Badge>
                          <span className="font-bold text-lg">{r.points_earned ?? 0} pts</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
          {scoringResults && scoringResults.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-4">
              No predictions found for this match. The scoring trigger had nothing to score.
            </div>
          )}
        </TabsContent>

        {/* =================== LIVE MONITOR =================== */}
        <TabsContent value="monitor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Radio className="h-5 w-5" /> Live Matches Monitor
              </CardTitle>
              <CardDescription>
                Auto-refreshing view of all matches currently in "live" status.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Button
                  size="sm"
                  variant={pollingEnabled ? 'destructive' : 'default'}
                  onClick={() => setPollingEnabled(!pollingEnabled)}
                >
                  {pollingEnabled ? <><Pause className="mr-1 h-3 w-3" /> Stop Polling</> : <><Play className="mr-1 h-3 w-3" /> Start Polling</>}
                </Button>
                <div className="flex items-center gap-2">
                  <Label className="text-xs whitespace-nowrap">Interval (s)</Label>
                  <Input
                    type="number"
                    min="5"
                    className="w-20 h-8"
                    value={pollingInterval}
                    onChange={e => setPollingInterval(e.target.value)}
                  />
                </div>
                {pollingEnabled && (
                  <Badge className="animate-pulse">Polling every {pollingInterval}s</Badge>
                )}
                <Button size="sm" variant="ghost" onClick={clearTimeline}>
                  <History className="mr-1 h-3 w-3" /> Clear History
                </Button>
              </div>

              {liveMatches && liveMatches.length > 0 ? (
                <div className="space-y-2">
                  {liveMatches.map(m => {
                    const entries = timelineRef.current.get(m.id) || [];
                    return (
                      <div key={m.id} className="rounded-md bg-muted/50 border">
                        <div className="flex items-center justify-between p-3">
                          <div>
                            <p className="font-medium text-sm">{m.home_team} vs {m.away_team}</p>
                            <p className="text-xs text-muted-foreground">
                              {m.stage} {m.group_name ? `• Group ${m.group_name}` : ''}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold">{m.home_score ?? 0} - {m.away_score ?? 0}</p>
                            <Badge variant="default" className="text-[10px]">LIVE</Badge>
                          </div>
                        </div>
                        {entries.length > 0 && (
                          <Collapsible>
                            <CollapsibleTrigger className="flex items-center gap-1 px-3 pb-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full">
                              <ChevronDown className="h-3 w-3" />
                              <History className="h-3 w-3" />
                              {entries.length} update(s)
                            </CollapsibleTrigger>
                            <CollapsibleContent className="px-3 pb-3">
                              <div className="space-y-1 border-l-2 border-primary/30 pl-3 ml-1">
                                {entries.map((e, i) => (
                                  <div key={i} className="flex items-center gap-2 text-xs">
                                    <span className="text-muted-foreground font-mono">
                                      {e.time.toLocaleTimeString()}
                                    </span>
                                    <span className="font-semibold">{e.home} - {e.away}</span>
                                    <Badge variant="outline" className="text-[9px] h-4">{e.status}</Badge>
                                  </div>
                                ))}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No matches currently live. Use the simulation tab or import live games to see them here.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* =================== INJECT MATCH =================== */}
        <TabsContent value="inject" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Plus className="h-5 w-5" /> Create Test Match
                </CardTitle>
                <CardDescription>
                  Inject a temporary match with today's date for testing the full prediction → live → scored flow.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Home Team</Label>
                  <Input placeholder="e.g. Brazil" value={injectHome} onChange={e => setInjectHome(e.target.value)} />
                </div>
                <div>
                  <Label>Away Team</Label>
                  <Input placeholder="e.g. Germany" value={injectAway} onChange={e => setInjectAway(e.target.value)} />
                </div>
                <Button onClick={handleInjectMatch} disabled={injectLoading} className="w-full">
                  {injectLoading ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : <><Plus className="mr-2 h-4 w-4" /> Create Match</>}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Trash2 className="h-5 w-5" /> Clean Up
                </CardTitle>
                <CardDescription>
                  Remove all test matches (TEST & LIVE_TEST) from the database.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {testMatchCount} test match(es) in database.
                </p>
                <Button variant="destructive" onClick={handleDeleteTestMatches} className="w-full">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete All Test Matches
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
