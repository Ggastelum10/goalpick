import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/Layout';
import { useLeagues, useJoinLeague } from '@/hooks/useLeagues';
import { LeagueCard } from '@/components/LeagueCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Users, Trophy, Loader2, Globe, Eye } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useIsAdmin } from '@/hooks/useProfile';
import { useViewMode } from '@/hooks/useViewMode';
import { Badge } from '@/components/ui/badge';

export default function Leagues() {
  const { t } = useTranslation();
  const { data, isLoading } = useLeagues();
  const joinLeague = useJoinLeague();
  const navigate = useNavigate();
  const { data: isAdmin } = useIsAdmin();
  const { isAdminViewActive } = useViewMode();
  const [inviteCode, setInviteCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleJoinWithCode = () => {
    if (inviteCode.trim()) {
      navigate(`/join/${inviteCode.trim()}`);
    }
  };

  const handleJoinLeague = (leagueId: string) => {
    joinLeague.mutate(leagueId);
  };

  const filteredMyLeagues = data?.myLeagues?.filter(league =>
    league.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const filteredPublicLeagues = data?.publicLeagues?.filter(league =>
    league.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // In admin view, show all leagues (my leagues + public leagues combined without duplicates)
  const allLeagues = isAdminViewActive 
    ? [...filteredMyLeagues, ...filteredPublicLeagues.filter(
        pl => !filteredMyLeagues.some(ml => ml.id === pl.id)
      )]
    : [];

  return (
    <Layout>
      <div className="space-y-4 md:space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{t('leagues.title')}</h1>
              {isAdmin && (
                <Badge variant={isAdminViewActive ? 'default' : 'outline'} className="gap-1">
                  <Eye className="h-3 w-3" />
                  {isAdminViewActive ? t('leagues.header.adminView') : t('leagues.header.userView')}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {isAdminViewActive 
                ? t('leagues.header.subtitleAdmin')
                : t('leagues.header.subtitleUser')
              }
            </p>
          </div>
          <Button asChild>
            <Link to="/leagues/create">
              <Plus className="h-4 w-4 mr-2" />
              {t('leagues.createLeague')}
            </Link>
          </Button>
        </div>

        {/* Join with invite code */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{t('leagues.joinWithCode')}</CardTitle>
            <CardDescription>{t('leagues.invite.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder={t('leagues.invite.placeholder')}
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="max-w-xs"
              />
              <Button onClick={handleJoinWithCode} disabled={!inviteCode.trim()}>
                {t('leagues.invite.joinButton')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('leagues.search.placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Admin View - All Leagues */}
        {isAdminViewActive ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">{t('leagues.admin.allLeagues', { count: allLeagues.length })}</h2>
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : allLeagues.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Globe className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">{t('leagues.admin.noLeaguesFound')}</h3>
                  <p className="text-muted-foreground text-center">
                    {t('leagues.admin.noLeaguesFoundDesc')}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 md:gap-4 lg:grid-cols-2">
                {allLeagues.map((league) => (
                  <LeagueCard
                    key={league.id}
                    league={league}
                    onJoin={() => handleJoinLeague(league.id)}
                    isJoining={joinLeague.isPending}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* User View - Tabs */
          <Tabs defaultValue="my-leagues">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="my-leagues" className="gap-2">
                <Users className="h-4 w-4" />
                {t('leagues.tabs.myLeaguesWithCount', { count: filteredMyLeagues.length })}
              </TabsTrigger>
              <TabsTrigger value="public" className="gap-2">
                <Trophy className="h-4 w-4" />
                {t('leagues.tabs.publicLeaguesWithCount', { count: filteredPublicLeagues.length })}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="my-leagues" className="mt-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredMyLeagues.length === 0 ? (
                <Card>
                <CardContent className="flex flex-col items-center justify-center py-8 md:py-12">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">{t('leagues.empty.myLeaguesTitle')}</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      {t('leagues.empty.myLeaguesDesc')}
                    </p>
                    <Button asChild>
                      <Link to="/leagues/create">{t('leagues.empty.createFirst')}</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3 md:gap-4 lg:grid-cols-2">
                  {filteredMyLeagues.map((league) => (
                    <LeagueCard
                      key={league.id}
                      league={league}
                      onJoin={() => handleJoinLeague(league.id)}
                      isJoining={joinLeague.isPending}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="public" className="mt-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredPublicLeagues.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">{t('leagues.empty.publicTitle')}</h3>
                    <p className="text-muted-foreground text-center">
                      {t('leagues.empty.publicDesc')}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3 md:gap-4 lg:grid-cols-2">
                  {filteredPublicLeagues.map((league) => (
                    <LeagueCard
                      key={league.id}
                      league={league}
                      onJoin={() => handleJoinLeague(league.id)}
                      isJoining={joinLeague.isPending}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </Layout>
  );
}