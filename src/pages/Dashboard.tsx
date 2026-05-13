import { useTranslation } from 'react-i18next';
import { Trophy, Calendar, Target, TrendingUp, Zap, Users, DollarSign, Eye, List, Layers, ArrowRight } from 'lucide-react';
import { LeagueLogo } from '@/components/LeagueLogo';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { Layout } from '@/components/Layout';
import { MatchCard } from '@/components/MatchCard';
import { LeaderboardItem } from '@/components/LeaderboardItem';
import { StatCard } from '@/components/StatCard';
import { OnboardingModal } from '@/components/OnboardingModal';
import { useProfile, useIsAdmin } from '@/hooks/useProfile';
import { useUpcomingMatches } from '@/hooks/useMatches';
import { useTopLeaderboard, useUserRank } from '@/hooks/useLeaderboard';
import { useUserPredictions } from '@/hooks/usePredictions';
import { useLeaguePredictions } from '@/hooks/useLeaguePredictions';
import { usePoolSettings, usePaidUsersCount } from '@/hooks/usePoolSettings';
import { useAuth } from '@/hooks/useAuth';
import { useViewMode } from '@/hooks/useViewMode';
import { useUserLeagues } from '@/hooks/useUserLeagues';
import { useLeagueLeaderboard } from '@/hooks/useLeagueLeaderboard';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import goalpickLogo from '@/assets/goalpick-logo-v2.png';

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: isAdmin } = useIsAdmin();
  const { isAdminViewActive } = useViewMode();
  const { data: upcomingMatches } = useUpcomingMatches(3);
  const { data: topLeaderboardData } = useTopLeaderboard(5);
  const globalLeaderboard = topLeaderboardData || [];
  const { data: soloPredictions } = useUserPredictions(); // Solo predictions only
  const { data: poolSettings } = usePoolSettings();
  const { data: paidCount } = usePaidUsersCount();
  const { data: userLeagues } = useUserLeagues();
  const { scheduleMatchReminder, isEnabled: notificationsEnabled } = usePushNotifications();
  const { showOnboarding, completeOnboarding, skipOnboarding } = useOnboarding();
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null | undefined>(undefined);
  const [matchViewMode, setMatchViewMode] = useState<'list' | 'swipe'>(() => {
    const saved = localStorage.getItem('matchViewMode');
    return saved === 'swipe' ? 'swipe' : 'list';
  });
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);

  // Persist match view mode preference
  useEffect(() => {
    localStorage.setItem('matchViewMode', matchViewMode);
  }, [matchViewMode]);

  // Track carousel slide changes
  useEffect(() => {
    if (!carouselApi) return;
    
    const onSelect = () => {
      setCurrentSlide(carouselApi.selectedScrollSnap());
    };
    
    carouselApi.on('select', onSelect);
    return () => {
      carouselApi.off('select', onSelect);
    };
  }, [carouselApi]);

  // Schedule push notifications for upcoming matches
  useEffect(() => {
    if (!notificationsEnabled || !upcomingMatches) return;

    upcomingMatches.forEach(match => {
      // Schedule 1-hour reminder
      scheduleMatchReminder(
        match.id,
        match.home_team,
        match.away_team,
        new Date(match.match_date),
        60
      );
    });
  }, [upcomingMatches, notificationsEnabled, scheduleMatchReminder]);

  // Determine which view mode we're in
  const showGlobalView = isAdminViewActive;

  // Use first league as default if user has leagues
  // Use undefined to mean "no selection yet" (default to first league), null means "explicitly selected Solo"
  const primaryLeagueId = selectedLeagueId === undefined 
    ? (userLeagues?.[0]?.id || null)
    : selectedLeagueId;
  const { data: leagueLeaderboard } = useLeagueLeaderboard(primaryLeagueId);
  const { data: leaguePredictions } = useLeaguePredictions(primaryLeagueId || '');

  // Determine which predictions to use based on view mode
  const predictions = useMemo(() => {
    if (showGlobalView) {
      return soloPredictions || [];
    }
    // In user view with a league selected, use league predictions
    return primaryLeagueId ? (leaguePredictions || []) : (soloPredictions || []);
  }, [showGlobalView, primaryLeagueId, leaguePredictions, soloPredictions]);

  // Determine which leaderboard to show based on view mode
  const leaderboard = showGlobalView ? globalLeaderboard : leagueLeaderboard;
  const { data: computedUserRank } = useUserRank(user?.id || '');
  const userRank = leaderboard?.find(e => e.user_id === user?.id)?.rank || computedUserRank;

  const totalPool = (poolSettings?.entry_fee ?? 0) * (paidCount ?? 0);
  const totalMatches = 64; // Total tournament matches
  const predictionsProgress = predictions ? Math.round((predictions.length / totalMatches) * 100) : 0;

  // Calculate league-specific prize pool if a league is selected
  const selectedLeague = userLeagues?.find(l => l.id === primaryLeagueId);
  const leaguePrizePool = selectedLeague 
    ? selectedLeague.entry_fee * selectedLeague.member_count 
    : 0;
  const displayPrizePool = showGlobalView ? totalPool : leaguePrizePool;

  return (
    <Layout>
      {/* Onboarding Modal for first-time users */}
      <OnboardingModal 
        open={showOnboarding} 
        onComplete={completeOnboarding} 
        onSkip={skipOnboarding} 
      />
      
      <div className="space-y-4">
        {/* Header with Logo and gradient text */}
        <div className="animate-slide-up">
          <div className="flex flex-row items-center gap-2 sm:gap-4">
            {/* Compact Logo */}
            <div className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 flex items-center justify-center group relative flex-shrink-0">
              <div className="absolute inset-0 bg-gradient-to-br from-gold/20 to-primary/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <img 
                src={goalpickLogo} 
                alt="GOALPICK Logo" 
                className="h-8 sm:h-10 md:h-12 w-auto object-contain drop-shadow-[0_0_10px_rgba(34,197,94,0.25)] dark:drop-shadow-[0_0_20px_rgba(34,197,94,0.4)] group-hover:scale-105 transition-transform duration-300" 
              />
            </div>
            
            {/* Welcome Text */}
            <div className="flex items-center justify-start gap-2 flex-wrap min-w-0">
              <h1 className="font-display text-2xl sm:text-3xl md:text-4xl text-headline-sport whitespace-nowrap">
                {t('dashboard.welcome', { 
                  name: (() => {
                    const name = profile?.display_name || 'Player';
                    return name.length > 12 ? name.slice(0, 12) + '...' : name;
                  })()
                })}
              </h1>
              {isAdmin && (
                <Badge variant={isAdminViewActive ? 'default' : 'outline'} className="gap-1">
                  <Eye className="h-3 w-3" />
                  {isAdminViewActive ? t('dashboard.adminView') : t('dashboard.userView')}
                </Badge>
              )}
            </div>
          </div>
          <p className="text-muted-foreground flex items-center justify-start gap-2 mt-1 text-sm">
            <Zap className="h-4 w-4 text-accent" />
            {showGlobalView 
              ? t('dashboard.globalOverview')
              : t('dashboard.trackPredictions')
            }
          </p>
        </div>

        {/* League Selector for Users (not shown in admin view) - Always show with Mock Pick option */}
        {!showGlobalView && (
          <Card className="p-4 animate-slide-up border-l-4 border-primary bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Users className="h-5 w-5 text-primary" />
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
                </div>
                <span className="text-sm font-medium">{t('dashboard.viewingLeague')}</span>
              </div>
              <Select 
                value={primaryLeagueId || 'solo'} 
                onValueChange={(value) => setSelectedLeagueId(value === 'solo' ? null : value)}
              >
                <SelectTrigger className="w-[220px] bg-primary/10 hover:bg-primary/15 border-primary/30 font-semibold text-primary">
                  <SelectValue placeholder={t('dashboard.selectLeague')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solo">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-primary" />
                      <span>{t('matchesOverview.soloBracket')}</span>
                    </div>
                  </SelectItem>
                  {userLeagues?.map(league => (
                    <SelectItem key={league.id} value={league.id}>
                      <div className="flex items-center gap-2">
                        <LeagueLogo url={league.logo_url} name={league.name} size="xs" />
                        <span>{league.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" asChild>
                <Link 
                  to={primaryLeagueId ? `/leagues/${primaryLeagueId}` : '/solo-bracket'} 
                  className="gap-1"
                >
                  {primaryLeagueId ? t('dashboard.viewLeagueDetails') : t('dashboard.viewSoloBracket')}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </Card>
        )}

        {/* Stats Cards with animations */}
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2 md:gap-3 lg:grid-cols-4">
          <StatCard
            title={t('dashboard.totalPoints')}
            value={profile?.total_points || 0}
            icon={Trophy}
            colorClass="bg-primary/10 text-primary"
            trend={{ value: 12 }}
            className="animate-slide-up [animation-delay:100ms]"
          />
          <StatCard
            title={showGlobalView 
              ? t('dashboard.globalRank') 
              : (primaryLeagueId ? t('dashboard.leagueRank') : t('dashboard.soloMode'))}
            value={primaryLeagueId || showGlobalView ? (userRank || 0) : '—'}
            prefix={primaryLeagueId || showGlobalView ? '#' : ''}
            icon={TrendingUp}
            colorClass={primaryLeagueId || showGlobalView ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"}
            className="animate-slide-up [animation-delay:200ms]"
          />
          <StatCard
            title={t('dashboard.predictionsMade')}
            value={predictions?.length || 0}
            icon={Target}
            colorClass="bg-gp-purple/10 text-gp-purple"
            progress={predictionsProgress}
            className="animate-slide-up [animation-delay:300ms]"
          />
          <StatCard
            title={showGlobalView 
              ? t('dashboard.globalPrizePool') 
              : (primaryLeagueId ? t('dashboard.leaguePrizePool') : t('dashboard.prizePool'))}
            value={primaryLeagueId || showGlobalView ? displayPrizePool : '—'}
            prefix={primaryLeagueId || showGlobalView 
              ? (showGlobalView ? "$" : (selectedLeague?.currency === 'MXN' ? '$' : selectedLeague?.currency || '$')) 
              : ''}
            emoji={primaryLeagueId || showGlobalView ? "💰" : undefined}
            colorClass={primaryLeagueId || showGlobalView ? "bg-gold/10 text-gold" : "bg-muted text-muted-foreground"}
            className="animate-slide-up [animation-delay:400ms]"
          />
        </div>

        {/* Admin Quick Stats - Only in Admin View */}
        {showGlobalView && (
          <div className="grid gap-2 md:gap-3 md:grid-cols-3 animate-slide-up [animation-delay:500ms]">
            <Card className="p-4 border-primary/20 bg-primary/5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('dashboard.totalPlayers')}</p>
                  <p className="text-2xl font-bold">{globalLeaderboard?.length || 0}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 border-accent/20 bg-accent/5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <DollarSign className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('dashboard.paidEntries')}</p>
                  <p className="text-2xl font-bold">{paidCount || 0}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 border-gold/20 bg-gold/5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gold/10">
                  <Trophy className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('dashboard.totalPredictions')}</p>
                  <p className="text-2xl font-bold">{predictions?.length || 0}</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
          {/* Upcoming Matches */}
          <div className="lg:col-span-2 space-y-3 md:space-y-4 order-last lg:order-first">
            <CardHeader className="px-0 py-2 md:py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Calendar className="h-5 w-5 text-primary" /> {t('dashboard.upcomingMatches')}
                </CardTitle>
                
                {/* View toggle - only show on mobile when there are matches */}
                {upcomingMatches && upcomingMatches.length > 1 && (
                  <div className="flex items-center gap-1 sm:hidden">
                    <Button
                      variant={matchViewMode === 'list' ? 'default' : 'ghost'}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setMatchViewMode('list')}
                      aria-label={t('dashboard.listView')}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={matchViewMode === 'swipe' ? 'default' : 'ghost'}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setMatchViewMode('swipe')}
                      aria-label={t('dashboard.swipeView')}
                    >
                      <Layers className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              
              {/* CTA to Make Predictions */}
              {!showGlobalView && (
                <Link 
                  to={primaryLeagueId ? `/leagues/${primaryLeagueId}/matches` : '/solo-bracket'}
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline mt-1"
                >
                  {t('dashboard.makePredictions')} <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </CardHeader>
            {upcomingMatches?.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                {t('dashboard.noUpcoming')}
              </Card>
            ) : matchViewMode === 'swipe' ? (
              // Swipe/Carousel View (mobile only)
              <div className="sm:hidden w-[calc(100vw-2rem)] max-w-full overflow-hidden">
                <Carousel 
                  className="w-full" 
                  setApi={setCarouselApi}
                  opts={{
                    align: 'start',
                    loop: false,
                    skipSnaps: false,
                    dragFree: false,
                    containScroll: 'trimSnaps',
                  }}
                >
                  <CarouselContent className="-ml-0">
                    {upcomingMatches?.map((match, index) => (
                      <CarouselItem key={match.id} className="pl-0 basis-full min-w-0">
                        <div 
                          className={cn(
                            "transition-all duration-300 ease-out",
                            currentSlide === index 
                              ? "scale-100 opacity-100" 
                              : "scale-95 opacity-60"
                          )}
                        >
                          <MatchCard
                            match={match}
                            prediction={predictions?.find(p => p.match_id === match.id)}
                            leagueId={!showGlobalView ? primaryLeagueId || undefined : undefined}
                            enableInlineEdit={false}
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
                
                {/* Dot indicators */}
                <div className="flex justify-center items-center gap-2 mt-4">
                  {upcomingMatches?.map((_, index) => (
                    <button
                      key={index}
                      className={cn(
                        "h-2 w-2 rounded-full transition-all duration-200",
                        currentSlide === index 
                          ? "bg-primary w-4" 
                          : "bg-muted hover:bg-muted-foreground/50"
                      )}
                      onClick={() => carouselApi?.scrollTo(index)}
                      aria-label={`Go to match ${index + 1}`}
                    />
                  ))}
                  <span className="text-xs text-muted-foreground ml-2">
                    {currentSlide + 1}/{upcomingMatches?.length}
                  </span>
                </div>
              </div>
            ) : (
              // List View (default and desktop)
              <div className="space-y-2 md:space-y-3">
                {upcomingMatches?.map((match, index) => (
                  <div 
                    key={match.id} 
                    className="animate-slide-up"
                    style={{ animationDelay: `${(index + 1) * 100}ms` }}
                  >
                    <MatchCard
                      match={match}
                      prediction={predictions?.find(p => p.match_id === match.id)}
                      leagueId={!showGlobalView ? primaryLeagueId || undefined : undefined}
                      enableInlineEdit={false}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top 5 Leaderboard */}
          <div className="order-first lg:order-last">
            <CardHeader className="px-0">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Trophy className="h-5 w-5 text-gold" /> 
                {t('leaderboard.title')}
              </CardTitle>
            </CardHeader>
            <Card className="overflow-hidden">
              {primaryLeagueId || showGlobalView ? (
                <div className="divide-y divide-border">
                  {leaderboard && leaderboard.length > 0 ? (
                    leaderboard.slice(0, 5).map((entry, index) => (
                      <div
                        key={entry.id}
                        className="animate-slide-up"
                        style={{ animationDelay: `${(index + 1) * 100}ms` }}
                      >
                        <LeaderboardItem entry={entry} showRankChange={false} />
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-muted-foreground">
                      {t('leaderboard.noEntries')}
                    </div>
                  )}
                </div>
              ) : (
                /* Solo mode - no leaderboard */
                <div className="p-6 text-center">
                  <Trophy className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground mb-3">{t('dashboard.soloNoLeaderboard')}</p>
                  <Link to="/leagues" className="text-primary hover:underline text-sm">
                    {t('dashboard.joinLeagueToCompete')}
                  </Link>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}