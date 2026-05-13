import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsAdmin } from '@/hooks/useProfile';
import { useSyncMatches } from '@/hooks/useSyncMatches';
import { useSyncFifaMatches } from '@/hooks/useSyncFifaMatches';
import { useMatches } from '@/hooks/useMatches';
import { useGroupStandings, useUpsertGroupStandings } from '@/hooks/useGroupStandings';
import { useAdminPayments } from '@/hooks/useAdminPayments';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { usePoolSettings, useUpdatePoolSettings } from '@/hooks/usePoolSettings';
import { MatchSimulator, ScoringValidation, SystemHealthCheck, UserManagement, AdminSupportTickets, GameModes, GameTester, AdminLeagues, AdminLegal, SportMonksLiveTester, AdminMatches } from '@/components/admin';
import { RefreshCw, Shield, Database, Globe, Users, Save, CreditCard, DollarSign, Clock, CheckCircle, Trophy, Target, TrendingUp, BarChart3, Settings, Download, AlertTriangle, MessageSquare, Gamepad2, FlaskConical, FileText, Activity, CalendarClock } from 'lucide-react';
import { useViewMode } from '@/hooks/useViewMode';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Navigate } from 'react-router-dom';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function Admin() {
  const { isAdminViewActive } = useViewMode();
  const { data: isAdmin, isLoading } = useIsAdmin();
  const syncMatches = useSyncMatches();
  const syncFifaMatches = useSyncFifaMatches();
  const { data: matches } = useMatches();
  const { data: existingStandings } = useGroupStandings();
  const upsertStandings = useUpsertGroupStandings();
  const { data: paymentsData, isLoading: paymentsLoading } = useAdminPayments();
  const { data: globalLeaderboard } = useLeaderboard();
  const { data: poolSettings } = usePoolSettings();
  const updatePoolSettings = useUpdatePoolSettings();
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'pending' | 'entry' | 'platform'>('all');
  const [platformFeeAmount, setPlatformFeeAmount] = useState<string>('1.00');
  const [platformFeeCurrency, setPlatformFeeCurrency] = useState<string>('USD');
  
  // Extract unique groups and their teams from matches
  const groupsData = useMemo(() => {
    if (!matches) return {};
    
    const groups: Record<string, Set<string>> = {};
    matches
      .filter(m => m.stage === 'group' && m.group_name)
      .forEach(match => {
        const groupName = match.group_name!;
        if (!groups[groupName]) groups[groupName] = new Set();
        groups[groupName].add(match.home_team);
        groups[groupName].add(match.away_team);
      });
    
    return Object.fromEntries(
      Object.entries(groups)
        .map(([name, teams]) => [name, Array.from(teams).sort()])
        .sort(([a], [b]) => (a as string).localeCompare(b as string))
    );
  }, [matches]);

  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [standings, setStandings] = useState<Record<number, string>>({
    1: '', 2: '', 3: '', 4: ''
  });

  // Calculate global stats
  const globalEntries = (globalLeaderboard as any)?.entries || globalLeaderboard || [];
  const totalPlayers = Array.isArray(globalEntries) ? globalEntries.length : 0;
  const totalPredictions = Array.isArray(globalEntries) ? globalEntries.reduce((sum: number, p: any) => sum + (p.total_points > 0 ? 1 : 0), 0) : 0;
  const avgPoints = totalPlayers > 0 
    ? Math.round((Array.isArray(globalEntries) ? globalEntries.reduce((sum: number, p: any) => sum + (p.total_points || 0), 0) : 0) / totalPlayers)
    : 0;

  // Update standings when group changes or existing standings load
  useEffect(() => {
    if (selectedGroup && existingStandings) {
      const groupStandings = existingStandings.filter(s => s.group_name === selectedGroup);
      const newStandings: Record<number, string> = { 1: '', 2: '', 3: '', 4: '' };
      groupStandings.forEach(s => {
        newStandings[s.final_position] = s.team;
      });
      setStandings(newStandings);
    } else {
      setStandings({ 1: '', 2: '', 3: '', 4: '' });
    }
  }, [selectedGroup, existingStandings]);

  // Initialize platform fee settings from database
  useEffect(() => {
    if (poolSettings) {
      setPlatformFeeAmount(String(poolSettings.platform_fee_amount ?? 1));
      setPlatformFeeCurrency(poolSettings.platform_fee_currency ?? 'USD');
    }
  }, [poolSettings]);

  // Combine entry fees and platform fees into a single list with type distinction
  const allPayments = useMemo(() => {
    const entries = (paymentsData?.payments || []).map(p => ({
      id: p.id,
      user_id: p.user_id,
      league_id: p.league_id,
      league_name: p.league_name,
      amount: p.entry_fee,
      currency: p.currency,
      isPaid: p.has_paid,
      stripe_payment_id: p.stripe_payment_id,
      date: p.joined_at,
      display_name: p.display_name,
      avatar_url: p.avatar_url,
      type: 'entry' as const,
    }));
    
    const platformFees = (paymentsData?.platformFees || []).map(p => ({
      id: p.id,
      user_id: p.user_id,
      league_id: p.league_id,
      league_name: p.league_name,
      amount: p.amount,
      currency: p.currency,
      isPaid: !!p.paid_at,
      stripe_payment_id: p.stripe_payment_id,
      date: p.paid_at || p.league_name, // Use paid_at or fallback
      display_name: p.display_name,
      avatar_url: p.avatar_url,
      type: 'platform' as const,
    }));
    
    return [...entries, ...platformFees].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [paymentsData]);

  // Filter payments based on selected filter
  const filteredPayments = useMemo(() => {
    return allPayments.filter(p => {
      if (paymentFilter === 'paid') return p.isPaid;
      if (paymentFilter === 'pending') return !p.isPaid;
      if (paymentFilter === 'entry') return p.type === 'entry';
      if (paymentFilter === 'platform') return p.type === 'platform';
      return true;
    });
  }, [allPayments, paymentFilter]);

  // Export payments to CSV
  const handleExportCSV = useCallback(() => {
    if (allPayments.length === 0) {
      toast.error('No payments to export');
      return;
    }

    // CSV headers
    const headers = [
      'Type',
      'User',
      'League',
      'Amount',
      'Currency',
      'Status',
      'Date',
      'Stripe Payment ID'
    ];

    // Convert payments to CSV rows
    const rows = allPayments.map(payment => [
      payment.type === 'entry' ? 'Entry Fee' : 'Platform Fee',
      payment.display_name,
      payment.league_name,
      payment.amount.toString(),
      payment.currency,
      payment.isPaid ? 'Paid' : 'Pending',
      format(new Date(payment.date), 'yyyy-MM-dd'),
      payment.stripe_payment_id || ''
    ]);

    // Build CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payments-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${allPayments.length} payments to CSV`);
  }, [allPayments]);

  const handleSavePlatformFee = async () => {
    const amount = parseFloat(platformFeeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount greater than 0');
      return;
    }

    try {
      await updatePoolSettings.mutateAsync({
        platform_fee_amount: amount,
        platform_fee_currency: platformFeeCurrency,
      });
      toast.success('Platform fee settings saved!');
    } catch (error) {
      toast.error('Failed to save platform fee settings');
    }
  };

  const teamsInGroup = selectedGroup ? (groupsData[selectedGroup] || []) : [];

  const handleSaveStandings = async () => {
    if (!selectedGroup) return;
    
    const standingsArray = Object.entries(standings)
      .filter(([_, team]) => team !== '')
      .map(([position, team]) => ({
        group_name: selectedGroup,
        team,
        final_position: parseInt(position),
      }));

    if (standingsArray.length !== 4) {
      toast.error('Please select all 4 positions');
      return;
    }

    try {
      await upsertStandings.mutateAsync(standingsArray);
      toast.success(`Group ${selectedGroup} standings saved!`);
    } catch (error) {
      toast.error('Failed to save standings');
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl flex items-center gap-2">
            <Shield className="h-8 w-8" /> Admin Panel
          </h1>
          <p className="text-muted-foreground">Global management and tournament data</p>
        </div>

        {/* Global Statistics Overview */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Players</p>
                  <p className="text-2xl font-bold">{totalPlayers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-transparent">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Target className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Active Predictors</p>
                  <p className="text-2xl font-bold">{totalPredictions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gold/20 bg-gradient-to-br from-gold/5 to-transparent">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gold/10">
                  <TrendingUp className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg Points</p>
                  <p className="text-2xl font-bold">{avgPoints}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gp-purple/20 bg-gradient-to-br from-gp-purple/5 to-transparent">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gp-purple/10">
                  <BarChart3 className="h-5 w-5 text-gp-purple" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Matches</p>
                  <p className="text-2xl font-bold">{matches?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="sync" className="space-y-6">
          <TabsList className="flex w-full overflow-x-auto scrollbar-hide">
            <TabsTrigger value="sync" className="gap-2">
              <Database className="h-4 w-4" />
              Data Sync
            </TabsTrigger>
            <TabsTrigger value="standings" className="gap-2">
              <Trophy className="h-4 w-4" />
              Standings
            </TabsTrigger>
            <TabsTrigger value="matches" className="gap-2">
              <CalendarClock className="h-4 w-4" />
              Matches
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="support" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Support
            </TabsTrigger>
            <TabsTrigger value="games" className="gap-2">
              <Gamepad2 className="h-4 w-4" />
              Games
            </TabsTrigger>
            <TabsTrigger value="testing" className="gap-2">
              <Settings className="h-4 w-4" />
              Testing
            </TabsTrigger>
            <TabsTrigger value="tester" className="gap-2">
              <FlaskConical className="h-4 w-4" />
              Tester
            </TabsTrigger>
            <TabsTrigger value="leagues-admin" className="gap-2">
              <Trophy className="h-4 w-4" />
              Leagues
            </TabsTrigger>
            <TabsTrigger value="legal" className="gap-2">
              <FileText className="h-4 w-4" />
              Legal
            </TabsTrigger>
            <TabsTrigger value="live-test" className="gap-2">
              <Activity className="h-4 w-4" />
              Live Test
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sync" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" /> Sync Match Schedule
                  </CardTitle>
                  <CardDescription>
                    Fetch match schedule from external source
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => syncFifaMatches.mutate()}
                    disabled={syncFifaMatches.isPending}
                    className="w-full"
                  >
                    {syncFifaMatches.isPending ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Syncing matches...
                      </>
                    ) : (
                      <>
                        <Globe className="mr-2 h-4 w-4" />
                        Sync Match Schedule
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-3">
                    Imports all 104 matches including group stage and knockout rounds.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" /> Sync from Sportmonks
                  </CardTitle>
                  <CardDescription>
                    Fetch live scores and updates from Sportmonks API (during tournament)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => syncMatches.mutate()}
                    disabled={syncMatches.isPending}
                    variant="outline"
                    className="w-full"
                  >
                    {syncMatches.isPending ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Sync from Sportmonks
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-3">
                    Use this for live score updates during the tournament.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="standings">
            {/* Group Standings Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" /> Final Group Standings
                </CardTitle>
                <CardDescription>
                  Enter final group standings after group stage completes. This will be used to calculate group position bonus points.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a group..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(groupsData).map(group => (
                      <SelectItem key={group} value={group}>
                        Group {group}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedGroup && (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map(position => (
                      <div key={position} className="flex items-center gap-3">
                        <span className="w-20 text-sm font-medium">
                          {position === 1 ? '🥇 1st' : position === 2 ? '🥈 2nd' : position === 3 ? '🥉 3rd' : '4️⃣ 4th'}
                        </span>
                        <Select
                          value={standings[position]}
                          onValueChange={(value) => setStandings(prev => ({ ...prev, [position]: value }))}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select team..." />
                          </SelectTrigger>
                          <SelectContent>
                            {teamsInGroup.map(team => (
                              <SelectItem 
                                key={team} 
                                value={team}
                                disabled={Object.values(standings).includes(team) && standings[position] !== team}
                              >
                                {team}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}

                    <Button 
                      onClick={handleSaveStandings}
                      disabled={upsertStandings.isPending}
                      className="w-full mt-4"
                    >
                      {upsertStandings.isPending ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Group {selectedGroup} Standings
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="matches" className="space-y-6">
            <AdminMatches />
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            {/* Platform Fee Settings */}
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" /> Platform Fee Settings
                </CardTitle>
                <CardDescription>
                  Configure the platform fee charged for each league entry payment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="platformFeeAmount">Fee Amount</Label>
                    <Input
                      id="platformFeeAmount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={platformFeeAmount}
                      onChange={(e) => setPlatformFeeAmount(e.target.value)}
                      placeholder="1.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="platformFeeCurrency">Currency</Label>
                    <Select value={platformFeeCurrency} onValueChange={setPlatformFeeCurrency}>
                      <SelectTrigger id="platformFeeCurrency">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                        <SelectItem value="MXN">MXN - Mexican Peso</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                        <SelectItem value="GBP">GBP - British Pound</SelectItem>
                        <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button 
                      onClick={handleSavePlatformFee}
                      disabled={updatePoolSettings.isPending}
                      className="w-full"
                    >
                      {updatePoolSettings.isPending ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Fee Settings
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <Alert variant="default" className="border-gold/50 bg-gold/10">
                  <AlertTriangle className="h-4 w-4 text-gold" />
                  <AlertDescription className="text-xs">
                    <strong>Stripe Minimum Amounts:</strong> If your fee falls below Stripe's minimum for a currency, 
                    it will be automatically adjusted. Minimums: <span className="font-mono">USD $0.50</span> • 
                    <span className="font-mono">MXN $10</span> • <span className="font-mono">EUR €0.50</span> • 
                    <span className="font-mono">GBP £0.30</span> • <span className="font-mono">CAD $0.50</span>
                  </AlertDescription>
                </Alert>
                <p className="text-xs text-muted-foreground">
                  Current setting: <span className="font-medium">{platformFeeAmount} {platformFeeCurrency}</span> — 
                  automatically converted to the league's currency during checkout.
                </p>
              </CardContent>
            </Card>

            {/* Payments Dashboard */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" /> Payments Dashboard
                </CardTitle>
                <CardDescription>
                  View all entry fee payments across all leagues
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Stats Cards */}
                {paymentsData?.stats && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Globe className="h-4 w-4" />
                          <span className="text-xs">Total Leagues</span>
                        </div>
                        <p className="text-2xl font-bold">{paymentsData.stats.totalLeagues}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <DollarSign className="h-4 w-4" />
                          <span className="text-xs">Entry Fees</span>
                        </div>
                        <p className="text-2xl font-bold">{paymentsData.stats.totalRevenue.toLocaleString()} MXN</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-primary/5 border-primary/20">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-primary mb-1">
                          <DollarSign className="h-4 w-4" />
                          <span className="text-xs">Platform Fees</span>
                        </div>
                        <p className="text-2xl font-bold text-primary">${paymentsData.stats.totalPlatformFees} USD</p>
                        <p className="text-xs text-muted-foreground">{paymentsData.stats.totalPlatformFeeCount} payments</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Clock className="h-4 w-4" />
                          <span className="text-xs">Pending</span>
                        </div>
                        <p className="text-2xl font-bold text-yellow-500">{paymentsData.stats.pendingMembers}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Users className="h-4 w-4" />
                          <span className="text-xs">Total Members</span>
                        </div>
                        <p className="text-2xl font-bold">{paymentsData.stats.totalMembers}</p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Filter and Payments Table */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportCSV}
                      disabled={allPayments.length === 0}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Export CSV
                    </Button>
                    <Select value={paymentFilter} onValueChange={(v) => setPaymentFilter(v as any)}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Payments</SelectItem>
                        <SelectItem value="entry">Entry Fees Only</SelectItem>
                        <SelectItem value="platform">Platform Fees Only</SelectItem>
                        <SelectItem value="paid">Paid Only</SelectItem>
                        <SelectItem value="pending">Pending Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {paymentsLoading ? (
                    <div className="flex justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredPayments.map((payment) => (
                        <div 
                          key={`${payment.type}-${payment.id}`}
                          className={`flex items-center gap-3 p-3 rounded-lg border ${
                            payment.isPaid 
                              ? 'bg-green-500/5 border-green-500/20' 
                              : 'bg-yellow-500/5 border-yellow-500/20'
                          }`}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={payment.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {payment.display_name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium truncate">{payment.display_name}</span>
                              <Badge variant="outline" className="text-xs">{payment.league_name}</Badge>
                              {/* Payment Type Badge */}
                              {payment.type === 'entry' ? (
                                <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400">
                                  Entry Fee
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                                  Platform Fee
                                </Badge>
                              )}
                              {/* Payment Status Badge */}
                              {payment.isPaid ? (
                                <Badge variant="default" className="gap-1 bg-green-500 text-xs">
                                  <CheckCircle className="h-3 w-3" />
                                  Paid
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="gap-1 text-yellow-600 border-yellow-500 text-xs">
                                  <Clock className="h-3 w-3" />
                                  Pending
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(payment.date), 'MMM d, yyyy')}
                              {payment.stripe_payment_id && (
                                <span className="ml-2">• {payment.stripe_payment_id}</span>
                              )}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{payment.amount} {payment.currency}</p>
                          </div>
                        </div>
                      ))}
                      
                      {filteredPayments.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">
                          No payments found
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Management */}
          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          {/* Games Management */}
          <TabsContent value="games">
            <GameModes />
          </TabsContent>

          {/* Phase 3: Testing Tools */}
          <TabsContent value="testing" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Match Simulation */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" /> Match Simulation
                  </CardTitle>
                  <CardDescription>
                    Simulate match results to test the scoring trigger
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <MatchSimulator matches={matches || []} />
                </CardContent>
              </Card>

              {/* Scoring Validation */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" /> Scoring Validation
                  </CardTitle>
                  <CardDescription>
                    View calculated points for all predictions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScoringValidation />
                </CardContent>
              </Card>
            </div>

            {/* System Health Check */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" /> System Health Check
                </CardTitle>
                <CardDescription>
                  Verify triggers and functions are working correctly
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SystemHealthCheck />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="support" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" /> Support Tickets
                </CardTitle>
                <CardDescription>
                  Manage user support tickets and escalations from the Help Center AI chatbot
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AdminSupportTickets />
              </CardContent>
            </Card>
          </TabsContent>

          {isAdminViewActive && (
            <TabsContent value="tester" className="space-y-6">
              <GameTester />
            </TabsContent>
          )}

          {isAdminViewActive && (
            <TabsContent value="leagues-admin" className="space-y-6">
              <AdminLeagues />
            </TabsContent>
          )}

          <TabsContent value="legal" className="space-y-6">
            <AdminLegal />
          </TabsContent>

          <TabsContent value="live-test" className="space-y-6">
            <SportMonksLiveTester />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}