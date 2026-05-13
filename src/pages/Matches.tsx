import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/Layout';
import { LeaguePredictionSelector } from '@/components/LeaguePredictionSelector';
import { ReadOnlyGroupOverview } from '@/components/ReadOnlyGroupOverview';
import { ReadOnlyKnockoutOverview } from '@/components/ReadOnlyKnockoutOverview';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMatches } from '@/hooks/useMatches';
import { useStandalonePredictions } from '@/hooks/useStandalonePredictions';
import { useLeaguePredictions } from '@/hooks/useLeaguePredictions';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, LayoutGrid, Trophy, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

type ViewMode = 'groups' | 'knockout' | 'all';

export default function Matches() {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  // Persist selected league in localStorage
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(() => {
    const saved = localStorage.getItem('matchesOverviewLeague');
    return saved && saved !== 'solo' ? saved : null;
  });
  
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('matchesOverviewMode');
    return (saved as ViewMode) || 'all';
  });

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem('matchesOverviewLeague', selectedLeagueId ?? 'solo');
  }, [selectedLeagueId]);

  useEffect(() => {
    localStorage.setItem('matchesOverviewMode', viewMode);
  }, [viewMode]);

  // Fetch all matches
  const { data: matches, isLoading: matchesLoading } = useMatches();

  // Fetch predictions based on selected context
  const { data: standalonePredictions, isLoading: standaloneLoading } = useStandalonePredictions();
  const { data: leaguePredictions, isLoading: leagueLoading } = useLeaguePredictions(selectedLeagueId || '');

  // Select the right predictions based on context
  const predictions = selectedLeagueId ? leaguePredictions : standalonePredictions;
  const isLoading = matchesLoading || (selectedLeagueId ? leagueLoading : standaloneLoading);

  // Calculate completion stats
  const stats = useMemo(() => {
    if (!matches || !predictions) return { total: 0, predicted: 0, groups: 0, knockout: 0 };
    
    const groupMatches = matches.filter(m => m.stage === 'group');
    const knockoutMatches = matches.filter(m => m.stage !== 'group');
    
    const groupPredicted = predictions.filter(p => 
      groupMatches.some(m => m.id === p.match_id)
    ).length;
    
    const knockoutPredicted = predictions.filter(p => 
      knockoutMatches.some(m => m.id === p.match_id)
    ).length;

    return {
      total: matches.length,
      predicted: predictions.length,
      groups: groupPredicted,
      groupsTotal: groupMatches.length,
      knockout: knockoutPredicted,
      knockoutTotal: knockoutMatches.length,
    };
  }, [matches, predictions]);

  if (!user) {
    return (
      <Layout>
        <div className="text-center py-12">
          <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">{t('matchesOverview.signInToView')}</h2>
          <p className="text-muted-foreground">{t('matchesOverview.signInToViewDesc')}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl sm:text-3xl">{t('matchesOverview.title')}</h1>
            <Badge variant="secondary" className="gap-1">
              <Eye className="h-3 w-3" />
              {t('matchesOverview.readOnly')}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            {t('matchesOverview.subtitle')}
          </p>
        </div>

        {/* League Selector */}
        <LeaguePredictionSelector
          selectedLeagueId={selectedLeagueId}
          onLeagueChange={setSelectedLeagueId}
        />

        {/* View Mode Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="all" className="gap-1.5">
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">{t('matchesOverview.viewAll')}</span>
              </TabsTrigger>
              <TabsTrigger value="groups" className="gap-1.5">
                {t('matchesOverview.groupsTab')}
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 hidden sm:inline-flex">
                  {stats.groups}/{stats.groupsTotal}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="knockout" className="gap-1.5">
                <Trophy className="h-4 w-4 sm:hidden" />
                <span className="hidden sm:inline">{t('matchesOverview.knockoutTab')}</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 hidden sm:inline-flex">
                  {stats.knockout}/{stats.knockoutTotal}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Total Progress */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{t('matchesOverview.totalProgress')}:</span>
            <Badge 
              variant={stats.predicted === stats.total ? 'default' : 'secondary'}
              className={cn(
                stats.predicted === stats.total && 'bg-success text-success-foreground'
              )}
            >
              {stats.predicted}/{stats.total}
            </Badge>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Group Stage */}
            {(viewMode === 'all' || viewMode === 'groups') && (
              <ReadOnlyGroupOverview
                matches={matches || []}
                predictions={predictions || []}
              />
            )}

            {/* Knockout Bracket */}
            {(viewMode === 'all' || viewMode === 'knockout') && (
              <ReadOnlyKnockoutOverview
                matches={matches || []}
                predictions={predictions || []}
              />
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
