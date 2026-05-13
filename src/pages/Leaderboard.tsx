import { Layout } from '@/components/Layout';
import { LeaderboardItem } from '@/components/LeaderboardItem';
import { Card } from '@/components/ui/card';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { usePoolSettings, usePaidUsersCount } from '@/hooks/usePoolSettings';
import { useViewMode } from '@/hooks/useViewMode';
import { useUserLeagues } from '@/hooks/useUserLeagues';
import { useLeagueLeaderboard } from '@/hooks/useLeagueLeaderboard';
import { useIsAdmin } from '@/hooks/useProfile';
import { Loader2, Trophy, Sparkles, Users, Globe, Search, X } from 'lucide-react';
import { LeagueLogo } from '@/components/LeagueLogo';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Leaderboard() {
  const { data: isAdmin } = useIsAdmin();
  const { isAdminViewActive } = useViewMode();
  const { data: poolSettings } = usePoolSettings();
  const { data: paidCount } = usePaidUsersCount();
  const { data: userLeagues } = useUserLeagues();
  
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<'league' | 'global'>(
    isAdminViewActive ? 'global' : 'league'
  );

  const { data: globalLeaderboardData, isLoading: globalLoading } = useLeaderboard(page);
  const globalLeaderboard = globalLeaderboardData?.entries;
  const globalTotalCount = globalLeaderboardData?.totalCount ?? 0;
  const globalPageSize = globalLeaderboardData?.pageSize ?? 50;

  // Use first league as default if user has leagues
  const primaryLeagueId = selectedLeagueId || userLeagues?.[0]?.id || null;
  const { data: leagueLeaderboard, isLoading: leagueLoading } = useLeagueLeaderboard(primaryLeagueId);

  // Determine view based on tab or admin mode
  const showGlobalView = isAdminViewActive || viewTab === 'global';
  const leaderboardRaw = showGlobalView ? globalLeaderboard : leagueLeaderboard;
  const isLoading = showGlobalView ? globalLoading : leagueLoading;

  const filteredLeaderboard = useMemo(() => {
    if (!leaderboardRaw || !searchQuery.trim()) return leaderboardRaw;
    const q = searchQuery.trim().toLowerCase();
    return leaderboardRaw.filter(entry => entry.display_name.toLowerCase().includes(q));
  }, [leaderboardRaw, searchQuery]);

  const leaderboard = filteredLeaderboard;
  const totalPages = Math.ceil(globalTotalCount / globalPageSize);
  const showPagination = showGlobalView && globalTotalCount > globalPageSize;

  // Get selected league info for prize pool calculation
  const selectedLeague = userLeagues?.find(l => l.id === primaryLeagueId);
  
  // Prize pool calculation
  const globalTotalPool = (poolSettings?.entry_fee ?? 0) * (paidCount ?? 0);
  const leagueTotalPool = selectedLeague 
    ? selectedLeague.entry_fee * selectedLeague.member_count 
    : 0;
  const totalPool = showGlobalView ? globalTotalPool : leagueTotalPool;
  const currency = showGlobalView ? '$' : (selectedLeague?.currency === 'MXN' ? '$' : selectedLeague?.currency || '$');

  const prizes = [
    { place: '1st', emoji: '🥇', amount: totalPool * (poolSettings?.first_place_percentage ?? 70) / 100, color: 'from-gold to-yellow-600' },
    { place: '2nd', emoji: '🥈', amount: totalPool * (poolSettings?.second_place_percentage ?? 20) / 100, color: 'from-slate-300 to-slate-400' },
    { place: '3rd', emoji: '🥉', amount: totalPool * (poolSettings?.third_place_percentage ?? 10) / 100, color: 'from-orange-400 to-orange-600' },
  ];

  return (
    <Layout>
      <div className="space-y-4 md:space-y-5">
        <div className="animate-slide-up flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-4xl text-gradient-brand flex items-center gap-2">
              <Trophy className="h-8 w-8 text-gold" />
               Standings
            </h1>
            <p className="text-muted-foreground">
              {showGlobalView 
                ? 'Global rankings across all players'
                : 'Rankings within your league'
              }
            </p>
          </div>
          
          {/* View Toggle - Show for admins or when user has leagues */}
          {(isAdmin || (userLeagues && userLeagues.length > 0)) && (
            <Tabs 
              value={viewTab} 
              onValueChange={(v) => { setViewTab(v as 'league' | 'global'); setPage(0); }}
              className="animate-slide-up"
            >
              <TabsList>
                <TabsTrigger value="league" className="gap-2" disabled={!userLeagues?.length}>
                  <Users className="h-4 w-4" />
                  My League
                </TabsTrigger>
                {(isAdmin || isAdminViewActive) && (
                  <TabsTrigger value="global" className="gap-2">
                    <Globe className="h-4 w-4" />
                    Global
                  </TabsTrigger>
                )}
              </TabsList>
            </Tabs>
          )}
        </div>

        {/* League Selector - Only when viewing league tab */}
        {!showGlobalView && userLeagues && userLeagues.length > 0 && (
          <Card className="p-3 md:p-4 animate-slide-up">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">League:</span>
              </div>
              <Select 
                value={primaryLeagueId || ''} 
                onValueChange={(id) => { setSelectedLeagueId(id); setPage(0); }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select a league" />
                </SelectTrigger>
                <SelectContent>
                  {userLeagues.map(league => (
                    <SelectItem key={league.id} value={league.id}>
                      <div className="flex items-center gap-2">
                        <LeagueLogo url={league.logo_url} name={league.name} size="xs" />
                        <span>{league.name} ({league.member_count} members)</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="outline" className="gap-1">
                {selectedLeague?.member_count || 0} players
              </Badge>
            </div>
          </Card>
        )}

        {/* No Leagues Message */}
        {!showGlobalView && (!userLeagues || userLeagues.length === 0) && !isAdmin && (
          <Card className="p-8 text-center animate-slide-up border-dashed">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-medium mb-2">Join a League</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Join a league to see rankings and compete for prizes!
            </p>
            <Link 
              to="/leagues" 
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              Browse Leagues →
            </Link>
          </Card>
        )}

        {/* Prize Pool - Enhanced */}
        {(showGlobalView || (userLeagues && userLeagues.length > 0)) && totalPool > 0 && (
          <Card className="relative overflow-hidden gradient-brand p-4 md:p-6 animate-slide-up [animation-delay:100ms]">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full blur-2xl" />
            <Sparkles className="absolute top-4 right-4 h-6 w-6 text-white/30 animate-pulse" />
            
            <div className="relative z-10">
              <div className="text-center mb-6">
                <p className="text-sm text-white/80 uppercase tracking-wider">
                  {showGlobalView ? 'Global Prize Pool' : `${selectedLeague?.name} Prize Pool`}
                </p>
                <p className="font-display text-4xl md:text-5xl lg:text-6xl text-white drop-shadow-lg">
                  {currency}{totalPool.toLocaleString()}
                </p>
              </div>
              
              {/* Prize breakdown */}
              <div className="flex justify-center gap-4 sm:gap-8 md:gap-12">
                {prizes.map((p, index) => (
                  <div 
                    key={p.place} 
                    className={cn(
                      "text-center p-2 md:p-3 rounded-xl bg-white/10 backdrop-blur-sm",
                      "animate-bounce-in",
                      index === 0 && "scale-110"
                    )}
                    style={{ animationDelay: `${(index + 1) * 100}ms` }}
                  >
                    <div className="text-3xl mb-1">{p.emoji}</div>
                    <p className="font-display text-2xl text-white">{currency}{p.amount.toFixed(0)}</p>
                    <p className="text-xs text-white/70">{p.place} Place</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Search Bar */}
        {!isLoading && leaderboardRaw && leaderboardRaw.length > 0 && (
          <div className="relative animate-slide-up [animation-delay:150ms]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Leaderboard */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : leaderboard && leaderboard.length > 0 ? (
          <Card className="overflow-hidden animate-slide-up [animation-delay:200ms]">
            <div className="divide-y divide-border">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${(index + 3) * 50}ms` }}
                >
                  <LeaderboardItem 
                    entry={entry} 
                    showSparkChart={index < 5}
                  />
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card className="p-8 text-center text-muted-foreground animate-slide-up">
            <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No players in this leaderboard yet</p>
          </Card>
        )}

        {/* Pagination Controls */}
        {showPagination && (
          <div className="flex items-center justify-center gap-4 animate-slide-up [animation-delay:300ms]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p - 1)}
              disabled={page === 0}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages - 1}
              className="gap-1"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}