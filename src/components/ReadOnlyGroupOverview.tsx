import { useMemo, Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { Match } from '@/hooks/useMatches';
import { Prediction } from '@/hooks/usePredictions';
import { calculateGroupStandings } from '@/lib/bracketSimulation';
import { ReadOnlyGroupCard } from './ReadOnlyGroupCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy } from 'lucide-react';

interface ReadOnlyGroupOverviewProps {
  matches: Match[];
  predictions: Prediction[];
}

// Skeleton loader for lazy-loaded groups
function GroupCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card shadow-md overflow-hidden">
      <div className="py-3 px-4 border-b bg-gradient-to-r from-primary/5 via-transparent to-primary/5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      </div>
      <div className="p-3 space-y-4">
        {/* Standings skeleton */}
        <div>
          <Skeleton className="h-4 w-20 mb-2" />
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </div>
        {/* Matches skeleton */}
        <div>
          <Skeleton className="h-4 w-20 mb-2" />
          <div className="space-y-1">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ReadOnlyGroupOverview({ matches, predictions }: ReadOnlyGroupOverviewProps) {
  const { t } = useTranslation();

  // Calculate standings and organize by group
  const groupData = useMemo(() => {
    const groupMatches = matches.filter(m => m.stage === 'group');
    const standings = calculateGroupStandings(matches, predictions);
    
    // Get unique group names and sort them
    const groupNames = [...new Set(groupMatches.map(m => m.group_name).filter(Boolean))] as string[];
    groupNames.sort();

    return groupNames.map(groupName => ({
      groupName,
      matches: groupMatches.filter(m => m.group_name === groupName),
      standings: standings[groupName] || [],
    }));
  }, [matches, predictions]);

  // Split groups for lazy loading (first 6 immediate, rest lazy)
  const groupsAboveFold = groupData.slice(0, 6);
  const groupsBelowFold = groupData.slice(6);

  // Calculate completion stats
  const completionStats = useMemo(() => {
    const groupMatches = matches.filter(m => m.stage === 'group');
    const groupPredictions = predictions.filter(p => 
      groupMatches.some(m => m.id === p.match_id)
    );
    return {
      predicted: groupPredictions.length,
      total: groupMatches.length,
    };
  }, [matches, predictions]);

  if (groupData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t('matchesOverview.noGroupMatches')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-bold tracking-wide">
            {t('matchesOverview.groupStage')}
          </h2>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{groupData.length} {t('matchesOverview.groups')}</span>
          <span className="text-muted-foreground/50">•</span>
          <span className="font-medium">
            {completionStats.predicted}/{completionStats.total} {t('matchesOverview.predicted')}
          </span>
        </div>
      </div>
      
      {/* Groups Grid - Responsive: 1 col mobile, 2 col tablet, 3 col desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {groupsAboveFold.map(({ groupName, matches: groupMatches, standings }) => (
          <ReadOnlyGroupCard
            key={groupName}
            groupName={groupName}
            matches={groupMatches}
            predictions={predictions}
            standings={standings}
          />
        ))}
      </div>

      {/* Lazy-loaded groups below fold */}
      {groupsBelowFold.length > 0 && (
        <Suspense fallback={
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {groupsBelowFold.map((_, index) => (
              <GroupCardSkeleton key={`skeleton-${index}`} />
            ))}
          </div>
        }>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {groupsBelowFold.map(({ groupName, matches: groupMatches, standings }) => (
              <ReadOnlyGroupCard
                key={groupName}
                groupName={groupName}
                matches={groupMatches}
                predictions={predictions}
                standings={standings}
              />
            ))}
          </div>
        </Suspense>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm border-l-4 border-l-success bg-success/10" />
          <span>{t('groupStage.qualified', 'Qualified (Top 2)')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm border-l-4 border-l-primary bg-primary/10" />
          <span>{t('groupStage.thirdPlace', '3rd Place')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-yellow-500/20" />
          <span>{t('groupStage.tieIndicator', 'Tie - needs resolution')}</span>
        </div>
      </div>
    </div>
  );
}
