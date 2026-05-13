import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Users, Trophy, Lock, Globe, Crown, Info, Eye } from 'lucide-react';
import { LeagueLogo } from '@/components/LeagueLogo';
import { Link } from 'react-router-dom';
import { LeagueWithMembers } from '@/hooks/useLeagues';
import { LeaguePreviewDialog } from '@/components/LeaguePreviewDialog';

interface LeagueCardProps {
  league: LeagueWithMembers;
  onJoin?: () => void;
  isJoining?: boolean;
}

export function LeagueCard({ league, onJoin, isJoining }: LeagueCardProps) {
  const { t } = useTranslation();
  const [previewOpen, setPreviewOpen] = useState(false);
  const prizePool = league.entry_fee * (league.member_count || 1);
  
  return (
    <>
      <Card className="hover:border-primary/50 transition-colors">
        <CardHeader className="pb-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <LeagueLogo
                url={(league as { logo_url?: string | null }).logo_url}
                scale={(league as { logo_scale?: number | null }).logo_scale}
                offsetX={(league as { logo_offset_x?: number | null }).logo_offset_x}
                offsetY={(league as { logo_offset_y?: number | null }).logo_offset_y}
                name={league.name}
                size="sm"
              />
              {league.is_owner && (
                <Crown className="h-4 w-4 text-yellow-500 flex-shrink-0" />
              )}
              <CardTitle className="text-lg truncate">{league.name}</CardTitle>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
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
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {league.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{league.description}</p>
          )}
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{t('leagues.card.membersCount', { count: league.member_count })}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Trophy className="h-4 w-4" />
                <span>{prizePool.toLocaleString()} {league.currency}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1.5 border-t border-border">
            <div className="flex items-center gap-1 text-sm">
              <span className="text-muted-foreground">{t('leagues.card.entryFeeLabel')}</span>
              <span className="font-medium">{league.entry_fee} {league.currency}</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[180px]">
                    <p>{t('leagues.card.entryFeeTooltip')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <div className="flex items-center gap-1.5">
              {/* View Details button for non-members */}
              {!league.is_member && !league.is_owner && (
                <Button variant="ghost" size="sm" onClick={() => setPreviewOpen(true)} className="gap-1 text-muted-foreground">
                  <Eye className="h-3.5 w-3.5" />
                  {t('leagues.card.details')}
                </Button>
              )}

              {league.is_member || league.is_owner ? (
                <Button asChild size="sm">
                  <Link to={`/leagues/${league.id}`}>
                    {league.has_paid || league.is_owner ? t('leagues.card.viewLeague') : t('leagues.card.completePayment')}
                  </Link>
                </Button>
              ) : (
                <Button size="sm" onClick={onJoin} disabled={isJoining}>
                  {isJoining ? t('leagues.card.joining') : t('leagues.card.joinLeague')}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <LeaguePreviewDialog
        league={league}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onJoin={onJoin}
        isJoining={isJoining}
      />
    </>
  );
}
