import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Users, Trophy, Lock, Globe, Info } from 'lucide-react';
import { LeagueWithMembers } from '@/hooks/useLeagues';
import { LeagueLogo } from '@/components/LeagueLogo';
import { Link } from 'react-router-dom';

interface LeaguePreviewDialogProps {
  league: LeagueWithMembers | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoin?: () => void;
  isJoining?: boolean;
}

export function LeaguePreviewDialog({ league, open, onOpenChange, onJoin, isJoining }: LeaguePreviewDialogProps) {
  const { t } = useTranslation();
  if (!league) return null;

  const prizePool = league.entry_fee * (league.member_count || 1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <LeagueLogo url={league.logo_url} name={league.name} size="md" />
            <DialogTitle className="text-xl">{league.name}</DialogTitle>
            {league.is_public ? (
              <Badge variant="secondary" className="gap-1">
                <Globe className="h-3 w-3" />
                {t('leagues.card.public')}
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1">
                <Lock className="h-3 w-3" />
                {t('leagues.card.private')}
              </Badge>
            )}
          </div>
          {league.description && (
            <DialogDescription>{league.description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">{t('leagues.card.membersCount', { count: league.member_count })}</p>
                <p className="text-xs text-muted-foreground">{t('leagues.preview.currentlyJoined')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Trophy className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">{prizePool.toLocaleString()} {league.currency}</p>
                <p className="text-xs text-muted-foreground">{t('leagues.preview.prizePool')}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Entry Fee */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">{t('leagues.card.entryFeeLabel')}</span>
              <span className="font-medium">{league.entry_fee} {league.currency}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Info className="h-3 w-3" />
              <span>{t('leagues.preview.entryFeeCollected')}</span>
            </div>
          </div>

          {/* Prize Distribution */}
          <div className="space-y-2">
            <p className="text-sm font-medium">{t('leagues.preview.prizeDistribution')}</p>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="text-center p-2 bg-muted/50 rounded-md">
                <p className="text-xs text-muted-foreground">🥇 {t('leagues.preview.first')}</p>
                <p className="font-medium">{league.first_place_percentage}%</p>
              </div>
              <div className="text-center p-2 bg-muted/50 rounded-md">
                <p className="text-xs text-muted-foreground">🥈 {t('leagues.preview.second')}</p>
                <p className="font-medium">{league.second_place_percentage}%</p>
              </div>
              <div className="text-center p-2 bg-muted/50 rounded-md">
                <p className="text-xs text-muted-foreground">🥉 {t('leagues.preview.third')}</p>
                <p className="font-medium">{league.third_place_percentage}%</p>
              </div>
            </div>
          </div>

          {/* Scoring */}
          <div className="space-y-2">
            <p className="text-sm font-medium">{t('leagues.preview.scoring')}</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-2 bg-muted/50 rounded-md">
                <p className="text-xs text-muted-foreground">{t('leagues.preview.exactScore')}</p>
                <p className="font-medium">{league.exact_score_points} {t('leagues.preview.pts')}</p>
              </div>
              <div className="p-2 bg-muted/50 rounded-md">
                <p className="text-xs text-muted-foreground">{t('leagues.preview.correctOutcome')}</p>
                <p className="font-medium">{league.outcome_points} {t('leagues.preview.pts')}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Action */}
          {league.is_member || league.is_owner ? (
            <Button asChild className="w-full">
              <Link to={`/leagues/${league.id}`}>
                {league.has_paid || league.is_owner ? t('leagues.card.viewLeague') : t('leagues.card.completePayment')}
              </Link>
            </Button>
          ) : (
            <Button className="w-full" onClick={onJoin} disabled={isJoining}>
              {isJoining ? t('leagues.card.joining') : t('leagues.card.joinLeague')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
