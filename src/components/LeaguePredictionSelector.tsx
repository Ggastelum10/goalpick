import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useUserLeagues, UserLeague } from '@/hooks/useUserLeagues';
import { Trophy, Users, ExternalLink, Plus, Shield, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface LeaguePredictionSelectorProps {
  selectedLeagueId: string | null; // null = Mock Pick
  onLeagueChange: (leagueId: string | null) => void;
}

export function LeaguePredictionSelector({ 
  selectedLeagueId, 
  onLeagueChange 
}: LeaguePredictionSelectorProps) {
  const { t } = useTranslation();
  const { data: leagues, isLoading } = useUserLeagues();

  const selectedLeague = leagues?.find(l => l.id === selectedLeagueId);
  const editPath = selectedLeagueId 
    ? `/leagues/${selectedLeagueId}/matches` 
    : '/solo-bracket';

  if (isLoading) {
    return (
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-48" />
      </div>
    );
  }

  // If user has no leagues, show empty state CTA
  if (!leagues || leagues.length === 0) {
    return (
      <Card className="border-dashed border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 overflow-hidden">
        <CardContent className="flex flex-col items-center text-center gap-4 py-6 px-5 relative">
          {/* Decorative background elements */}
          <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-primary/5 blur-2xl" />
          <div className="absolute -bottom-4 -left-4 h-20 w-20 rounded-full bg-accent/5 blur-2xl" />
          
          {/* Icon cluster */}
          <div className="relative">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Shield className="h-7 w-7 text-primary" />
            </div>
            <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-accent/20 flex items-center justify-center">
              <Sparkles className="h-3 w-3 text-primary" />
            </div>
          </div>

          <div>
            <p className="font-semibold text-base">{t('matchesOverview.noLeagues')}</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">{t('matchesOverview.noLeaguesDesc')}</p>
          </div>

          <div className="flex gap-2.5">
            <Button variant="outline" asChild size="sm" className="border-primary/20 hover:bg-primary/5">
              <Link to="/leagues">
                <Users className="h-4 w-4 mr-1.5" />
                {t('matchesOverview.browseLeagues')}
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/leagues/create">
                <Plus className="h-4 w-4 mr-1.5" />
                {t('matchesOverview.createLeague')}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-primary bg-gradient-to-r from-primary/5 to-transparent">
      <CardContent className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Trophy className="h-4 w-4 text-primary" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
          </div>
          <span className="text-sm text-muted-foreground">{t('matchesOverview.viewingPredictions')}</span>
        </div>
        
        <div className="flex items-center gap-3 flex-1">
          <Select 
            value={selectedLeagueId ?? 'solo'} 
            onValueChange={(value) => onLeagueChange(value === 'solo' ? null : value)}
          >
            <SelectTrigger className="w-full sm:w-56 bg-primary/10 hover:bg-primary/15 border-primary/30 font-semibold text-primary">
              <SelectValue placeholder={t('matchesOverview.selectLeague')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="solo">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-primary" />
                  <span>{t('matchesOverview.soloBracket')}</span>
                </div>
              </SelectItem>
              {leagues.map((league) => (
                <SelectItem key={league.id} value={league.id}>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate max-w-[180px]">{league.name}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {league.member_count}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="default" size="sm" asChild className="shrink-0">
            <Link to={editPath}>
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              <span className="hidden sm:inline">{t('matchesOverview.editPredictions')}</span>
              <span className="sm:hidden">{t('common.edit')}</span>
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
