import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { useLeague, useJoinLeague, useDeleteLeague, usePurchaseLicenses } from '@/hooks/useLeagues';
import type { StageMultipliers, GroupPositionBonuses } from '@/hooks/useLeagues';
import { usePlatformFee } from '@/hooks/usePlatformFee';
import { useProfile } from '@/hooks/useProfile';
import { buildInviteUrl } from '@/lib/inviteUrl';

import { LeagueLeaderboard } from '@/components/LeagueLeaderboard';
import { InviteModal } from '@/components/InviteModal';
import { ScoringRulesDisplay } from '@/components/ScoringRulesDisplay';
import { LeagueSettingsDialog } from '@/components/LeagueSettingsDialog';
import { LeagueLogo } from '@/components/LeagueLogo';
import { useTournamentStarted } from '@/hooks/useTournamentStarted';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  ArrowLeft, 
  Users, 
  Trophy, 
  Trash2, 
  Loader2,
  CheckCircle,
  XCircle,
  Crown,
  Globe,
  Lock,
  UserPlus,
  Clock,
  Mail,
  Info,
  RefreshCw,
  Target,
  Ticket,
  Plus,
  Minus,
  Settings,
  Shield
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { es as esLocale } from 'date-fns/locale';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function LeagueDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data, isLoading, refetch } = useLeague(id || '');
  const { data: platformFee, isLoading: feeLoading } = usePlatformFee();
  const { data: profile } = useProfile();
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('es') ? esLocale : undefined;
  
  const joinLeague = useJoinLeague();
  const deleteLeague = useDeleteLeague();
  const purchaseLicenses = usePurchaseLicenses();
  const [licenseCount, setLicenseCount] = useState(5);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { data: tournamentStatus } = useTournamentStarted();
  const hasStarted = tournamentStatus?.hasStarted ?? false;
  const firstMatchDate = tournamentStatus?.firstMatchDate ?? null;


  // Handle payment and license purchase redirects
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const licensesStatus = searchParams.get('licenses');
    
    if (paymentStatus === 'success') {
      toast.success(t('leagues.detail.toasts.paymentSuccess'));
      refetch();
      navigate(`/leagues/${id}`, { replace: true });
    } else if (paymentStatus === 'cancelled') {
      toast.info(t('leagues.detail.toasts.paymentCancelled'));
      navigate(`/leagues/${id}`, { replace: true });
    } else if (licensesStatus === 'success') {
      toast.success(t('leagues.detail.toasts.licensesSuccess'));
      refetch();
      navigate(`/leagues/${id}`, { replace: true });
    } else if (licensesStatus === 'cancelled') {
      toast.info(t('leagues.detail.toasts.licensesCancelled'));
      navigate(`/leagues/${id}`, { replace: true });
    }
  }, [searchParams, id, navigate, refetch, t]);

  // Refetch data when tab becomes visible (handles payment completed in another tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refetch();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refetch]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!data?.league) {
    return (
      <Layout>
        <div className="text-center py-20">
          <h2 className="text-xl font-medium mb-2">{t('leagues.detail.notFound')}</h2>
          <p className="text-muted-foreground mb-4">{t('leagues.detail.notFoundDesc')}</p>
          <Button onClick={() => navigate('/leagues')}>{t('leagues.detail.backToLeagues')}</Button>
        </div>
      </Layout>
    );
  }

  const { league, members, isOwner, isMember, hasPaid } = data;
  const isAdminPreview = (data as { isAdminPreview?: boolean }).isAdminPreview ?? false;
  const paidMembers = members.filter(m => m.has_paid);
  const pendingMembers = members.filter(m => !m.has_paid);
  const prizePool = league.prize_pool || 0;
  const showPrizePool = (league as { show_prize_pool?: boolean }).show_prize_pool ?? true;
  const showPrizeDistribution = (league as { show_prize_distribution?: boolean }).show_prize_distribution ?? true;


  const handleJoin = () => {
    joinLeague.mutate(league.id);
  };

  const handleDelete = async () => {
    try {
      await deleteLeague.mutateAsync(league.id);
      navigate('/leagues');
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {isAdminPreview && (
          <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-4 py-2 text-sm text-primary">
            <Shield className="h-4 w-4" />
            <span className="font-medium">{t('leagues.detail.adminPreview')}</span>
            <span className="text-muted-foreground">· {t('leagues.detail.adminPreviewReadOnly')}</span>
          </div>
        )}
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/leagues')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <LeagueLogo url={(league as { logo_url?: string | null }).logo_url} name={league.name} size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold">{league.name}</h1>
                {isOwner && (
                  <Crown className="h-4 w-4 text-yellow-500" aria-label={t('leagues.detail.ownerBadge', 'Owner') as string} />
                )}
                {league.is_public ? (
                  <Badge variant="secondary" className="gap-1">
                    <Globe className="h-3 w-3" />
                    {t('leagues.detail.public')}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1">
                    <Lock className="h-3 w-3" />
                    {t('leagues.detail.private')}
                  </Badge>
                )}
              </div>
              {league.description && (
                <p className="text-muted-foreground mt-1">{league.description}</p>
              )}
            </div>
          </div>

          {isOwner && (
            <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSettingsOpen(true)}
                      aria-label={t('leagues.detail.settingsTooltip')}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {hasStarted ? t('leagues.detail.settingsTooltipLocked') : t('leagues.detail.settingsTooltip')}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <InviteModal
                leagueId={league.id}
                leagueName={league.name}
                inviteCode={league.invite_code}
                inviterName={profile?.display_name || t('leagues.detail.invite.fallbackName')}
                logoUrl={(league as { logo_url?: string | null }).logo_url}
              >
                <Button variant="outline" size="icon">
                  <UserPlus className="h-4 w-4" />
                </Button>
              </InviteModal>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="icon">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('leagues.detail.delete.title')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('leagues.detail.delete.description')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('leagues.detail.delete.cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      {t('leagues.detail.delete.confirm')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        {isOwner && (
          <LeagueSettingsDialog
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            league={league as unknown as Parameters<typeof LeagueSettingsDialog>[0]['league']}
            hasStarted={hasStarted}
            firstMatchDate={firstMatchDate}
          />
        )}

        {/* Prediction Mode & Make Predictions */}
        {(hasPaid || isOwner) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                {t('leagues.detail.predictionMode.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-lg border bg-blue-500/5 border-blue-500/30">
                <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="space-y-2">
                  <p className="font-semibold text-blue-900 dark:text-blue-200">{t('leagues.detail.predictionMode.subtitle')}</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• {t('leagues.detail.predictionMode.bullet1')}</li>
                    <li>• {t('leagues.detail.predictionMode.bullet2')}</li>
                    <li>• {t('leagues.detail.predictionMode.bullet3')}</li>
                  </ul>
                </div>
              </div>
              <Button 
                className="w-full" 
                onClick={() => navigate(`/leagues/${league.id}/matches`)}
              >
                <Target className="h-4 w-4 mr-2" />
                {t('leagues.detail.predictionMode.cta')}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="h-4 w-4" />
                <span className="text-sm">{t('leagues.detail.stats.members')}</span>
              </div>
              <p className="text-2xl font-bold">{paidMembers.length}</p>
            </CardContent>
          </Card>
          {showPrizePool && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Trophy className="h-4 w-4" />
                  <span className="text-sm">{t('leagues.detail.stats.prizePool')}</span>
                </div>
                <p className="text-2xl font-bold">{prizePool.toLocaleString()} {league.currency}</p>
              </CardContent>
            </Card>
          )}
          {showPrizePool && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-1 text-muted-foreground mb-1 text-sm">
                  <span>{t('leagues.detail.stats.entryFee')}</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[200px]">
                        <p>{t('leagues.detail.stats.entryFeeTooltip')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-2xl font-bold">{league.entry_fee} {league.currency}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('leagues.detail.stats.managedByAdmin')}</p>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="pt-6">
              <div className="text-muted-foreground mb-1 text-sm">{t('leagues.detail.stats.yourStatus')}</div>
              {hasPaid || isOwner ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-green-500">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">{t('leagues.detail.stats.activeMember')}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t('leagues.detail.stats.paymentCompleted')}</p>
                </div>
              ) : isMember ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-yellow-500">
                    <Clock className="h-5 w-5 animate-pulse" />
                    <span className="font-medium">{t('leagues.detail.stats.paymentPending')}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t('leagues.detail.stats.completePaymentDesc')}</p>
                </div>
              ) : (
                <span className="text-muted-foreground">{t('leagues.detail.stats.notMember')}</span>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Join/Pay button if not a paid member */}
        {!hasPaid && !isOwner && (
          <Card className="border-primary">
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <h3 className="font-medium">
                  {isMember ? t('leagues.detail.join.completeTitle') : t('leagues.detail.join.joinTitle')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('leagues.detail.join.appAccess')} {feeLoading ? (
                    <Skeleton className="inline-block h-4 w-16" />
                  ) : (
                    `$${platformFee?.amount} ${platformFee?.currency}`
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('leagues.detail.join.feeArranged', { fee: league.entry_fee, currency: league.currency })}
                </p>
              </div>
              <Button onClick={handleJoin} disabled={joinLeague.isPending || feeLoading}>
                {joinLeague.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('leagues.detail.join.processing')}
                  </>
                ) : (
                  t('leagues.detail.join.payAndJoin', { amount: platformFee?.amount ?? 1 })
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Invite section — hidden for members when owner has enabled privacy */}
        {(hasPaid || isOwner) && (isOwner || !league.hide_invite_from_members) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t('leagues.detail.invite.title')}</CardTitle>
              <CardDescription>{t('leagues.detail.invite.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <div className="flex-1 bg-muted rounded-lg px-3 py-2 font-mono text-sm truncate">
                  {buildInviteUrl(league.invite_code, league.name)}
                </div>
                <InviteModal
                  leagueId={league.id}
                  leagueName={league.name}
                  inviteCode={league.invite_code}
                  inviterName={profile?.display_name || t('leagues.detail.invite.fallbackName')}
                  logoUrl={(league as { logo_url?: string | null }).logo_url}
                >
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    {t('leagues.detail.invite.button')}
                  </Button>
                </InviteModal>
              </div>
            </CardContent>
          </Card>
        )}


        {/* Prize distribution */}
        {showPrizeDistribution && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              {t('leagues.detail.prizeDistribution.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🥇</span>
                  <span className="font-medium">{t('leagues.detail.prizeDistribution.first')}</span>
                </div>
                <div className="text-right">
                  <p className="font-bold">{league.first_place_percentage}%</p>
                  <p className="text-sm text-muted-foreground">
                    {((prizePool * league.first_place_percentage) / 100).toLocaleString()} {league.currency}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-400/10 rounded-lg border border-gray-400/30">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🥈</span>
                  <span className="font-medium">{t('leagues.detail.prizeDistribution.second')}</span>
                </div>
                <div className="text-right">
                  <p className="font-bold">{league.second_place_percentage}%</p>
                  <p className="text-sm text-muted-foreground">
                    {((prizePool * league.second_place_percentage) / 100).toLocaleString()} {league.currency}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-amber-600/10 rounded-lg border border-amber-600/30">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🥉</span>
                  <span className="font-medium">{t('leagues.detail.prizeDistribution.third')}</span>
                </div>
                <div className="text-right">
                  <p className="font-bold">{league.third_place_percentage}%</p>
                  <p className="text-sm text-muted-foreground">
                    {((prizePool * league.third_place_percentage) / 100).toLocaleString()} {league.currency}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Scoring Rules */}
        <ScoringRulesDisplay
          exactScorePoints={league.exact_score_points}
          outcomePoints={league.outcome_points}
          stageMultipliers={league.stage_multipliers as unknown as StageMultipliers}
          groupPositionBonuses={league.group_position_bonuses as unknown as GroupPositionBonuses}
        />

        {/* Leaderboard */}
        <LeagueLeaderboard league={league} />

        {/* Prepaid Licenses for Owners */}
        {isOwner && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-primary" />
                {t('leagues.detail.licenses.title')}
              </CardTitle>
              <CardDescription>
                {league.owner_covers_fees 
                  ? t('leagues.detail.licenses.descTracking')
                  : t('leagues.detail.licenses.descPurchase')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div>
                  <p className="text-sm text-muted-foreground">{t('leagues.detail.licenses.remaining')}</p>
                  <p className="text-3xl font-bold">{league.prepaid_licenses ?? 0}</p>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <p>{t('leagues.detail.licenses.remainingHelpLine1')}</p>
                  <p>{t('leagues.detail.licenses.remainingHelpLine2')}</p>
                </div>
              </div>
              
              {/* Purchase more licenses */}
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3">{t('leagues.detail.licenses.purchaseAdditional')}</p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setLicenseCount(Math.max(1, licenseCount - 1))}
                      disabled={licenseCount <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input 
                      type="number" 
                      min={1}
                      value={licenseCount}
                      onChange={(e) => setLicenseCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 text-center"
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setLicenseCount(licenseCount + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    × ${platformFee?.amount ?? 1} {platformFee?.currency ?? 'USD'} = 
                    <span className="font-semibold text-foreground ml-1">
                      ${(licenseCount * (platformFee?.amount ?? 1)).toFixed(2)}
                    </span>
                  </span>
                  <Button 
                    onClick={() => {
                      if (licenseCount < 1) {
                        toast.error(t('leagues.detail.licenses.minError'));
                        return;
                      }
                      purchaseLicenses.mutate({ leagueId: league.id, licenseCount });
                    }}
                    disabled={purchaseLicenses.isPending || feeLoading || licenseCount < 1}
                    className="ml-auto"
                  >
                    {purchaseLicenses.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t('leagues.detail.licenses.processing')}
                      </>
                    ) : (
                      t('leagues.detail.licenses.purchase')
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Member Management for Owners */}
        {isOwner && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {t('leagues.detail.memberMgmt.title')}
              </CardTitle>
              <CardDescription>
                {t('leagues.detail.memberMgmt.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Stats summary */}
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>{t('leagues.detail.memberMgmt.paid', { count: paidMembers.length })}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <span>{t('leagues.detail.memberMgmt.pending', { count: pendingMembers.length })}</span>
                  </div>
                </div>

                {/* All members list */}
                <div className="space-y-2">
                  {members.map((member) => (
                    <div 
                      key={member.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        member.has_paid 
                          ? 'bg-green-500/5 border-green-500/20' 
                          : 'bg-yellow-500/5 border-yellow-500/20'
                      }`}
                    >
                      <Avatar>
                        <AvatarImage src={member.profile?.avatar_url || undefined} />
                        <AvatarFallback>
                          {member.profile?.display_name?.charAt(0).toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{member.profile?.display_name || t('leagues.detail.memberMgmt.unknown')}</span>
                          {member.role === 'owner' && (
                            <Badge variant="secondary" className="gap-1">
                              <Crown className="h-3 w-3" />
                              {t('leagues.detail.memberMgmt.owner')}
                            </Badge>
                          )}
                          {member.has_paid ? (
                            <Badge variant="default" className="gap-1 bg-green-500">
                              <CheckCircle className="h-3 w-3" />
                              {t('leagues.detail.memberMgmt.paidBadge')}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 text-yellow-600 border-yellow-500">
                              <Clock className="h-3 w-3" />
                              {t('leagues.detail.memberMgmt.pendingBadge')}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t('leagues.detail.memberMgmt.joinedOn', { date: format(new Date(member.joined_at), 'MMM d, yyyy', { locale: dateLocale }) })}
                          {member.stripe_payment_id && (
                            <span className="ml-2">• {t('leagues.detail.memberMgmt.paymentId')} {member.stripe_payment_id}</span>
                          )}
                        </p>
                      </div>
                      {!member.has_paid && member.role !== 'owner' && (
                        <Button variant="outline" size="sm" className="gap-1">
                          <Mail className="h-3 w-3" />
                          {t('leagues.detail.memberMgmt.remind')}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Members list (public view) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {t('leagues.detail.activeMembers.title', { count: paidMembers.length })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {paidMembers.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                {t('leagues.detail.activeMembers.empty')}
              </p>
            ) : (
              <div className="space-y-2">
                {paidMembers.map((member) => (
                  <div 
                    key={member.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <Avatar>
                      <AvatarImage src={member.profile?.avatar_url || undefined} />
                      <AvatarFallback>
                        {member.profile?.display_name?.charAt(0).toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{member.profile?.display_name || t('leagues.detail.memberMgmt.unknown')}</span>
                        {member.role === 'owner' && (
                          <Badge variant="secondary" className="gap-1">
                            <Crown className="h-3 w-3" />
                            {t('leagues.detail.memberMgmt.owner')}
                          </Badge>
                        )}
                      </div>
                      {member.profile?.favorite_team && (
                        <p className="text-sm text-muted-foreground">{member.profile.favorite_team}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{t('leagues.detail.activeMembers.pts', { count: member.profile?.total_points || 0 })}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
