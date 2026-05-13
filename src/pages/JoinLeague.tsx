import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useLeagueByInviteCode, useJoinLeague } from '@/hooks/useLeagues';
import { usePlatformFee } from '@/hooks/usePlatformFee';
import { useAuth } from '@/hooks/useAuth';
import { useStandalonePredictionCount } from '@/hooks/useStandalonePredictions';
import { ImportPredictionsDialog } from '@/components/ImportPredictionsDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Users, Trophy, Loader2, Lock, Globe, CreditCard, Target, Gift } from 'lucide-react';
import { LeagueLogo } from '@/components/LeagueLogo';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function JoinLeague() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: league, isLoading, error, refetch } = useLeagueByInviteCode(inviteCode || '');
  const { data: platformFee, isLoading: feeLoading } = usePlatformFee();
  const { data: standalonePredictionCount } = useStandalonePredictionCount();
  const joinLeague = useJoinLeague();
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [joinedLeagueId, setJoinedLeagueId] = useState<string | null>(null);

  // Check if user is already a paid member
  const { data: existingMembership } = useQuery({
    queryKey: ['membership-check', league?.id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('league_members')
        .select('has_paid')
        .eq('league_id', league!.id)
        .eq('user_id', user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!league?.id && !!user?.id,
  });

  // Redirect already-paid members to league detail
  useEffect(() => {
    if (existingMembership?.has_paid) {
      toast.success('You are already a member of this league!');
      navigate(`/leagues/${league!.id}`);
    }
  }, [existingMembership, league?.id, navigate]);

  // Refetch data when tab becomes visible
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

  if (!user) {
    return (
      <Layout>
        <div className="max-w-md mx-auto text-center py-20">
          <h2 className="text-xl font-medium mb-2">Sign in required</h2>
          <p className="text-muted-foreground mb-4">
            You need to sign in to join this league.
          </p>
          <Button onClick={() => navigate(`/auth?redirect=/join/${inviteCode}`)}>
            Sign In
          </Button>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (error || !league) {
    return (
      <Layout>
        <div className="max-w-md mx-auto text-center py-20">
          <h2 className="text-xl font-medium mb-2">League not found</h2>
          <p className="text-muted-foreground mb-4">
            This invite link is invalid or has expired.
          </p>
          <Button onClick={() => navigate('/leagues')}>Browse Leagues</Button>
        </div>
      </Layout>
    );
  }

  const prizePool = league.entry_fee * (league.member_count || 1);
  const feesWaived = !!(league as any).platform_fees_waived;

  const handleJoin = async () => {
    const result = await joinLeague.mutateAsync(league.id);
    // If successful and user has standalone predictions, show import dialog
    if (result && (standalonePredictionCount ?? 0) > 0) {
      setJoinedLeagueId(league.id);
      setShowImportDialog(true);
    } else {
      navigate(`/leagues/${league.id}`);
    }
  };

  const handleImportComplete = () => {
    setShowImportDialog(false);
    if (joinedLeagueId) {
      navigate(`/leagues/${joinedLeagueId}`);
    }
  };

  return (
    <Layout>
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/leagues')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Join League</h1>
            <p className="text-muted-foreground">You've been invited to join a league</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <LeagueLogo url={(league as { logo_url?: string | null }).logo_url} name={league.name} size="md" />
                <CardTitle className="text-xl truncate">{league.name}</CardTitle>
              </div>
              {league.is_public ? (
                <Badge variant="secondary" className="gap-1">
                  <Globe className="h-3 w-3" />
                  Public
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1">
                  <Lock className="h-3 w-3" />
                  Private
                </Badge>
              )}
            </div>
            {league.description && (
              <CardDescription>{league.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">Members</span>
                </div>
                <p className="text-2xl font-bold">{league.member_count}</p>
              </div>
              <div className="bg-muted rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                  <Trophy className="h-4 w-4" />
                  <span className="text-sm">Prize Pool</span>
                </div>
                <p className="text-2xl font-bold">{prizePool.toLocaleString()} {league.currency}</p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Prize Distribution</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>🥇 1st Place</span>
                  <span className="font-medium">{league.first_place_percentage}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>🥈 2nd Place</span>
                  <span className="font-medium">{league.second_place_percentage}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>🥉 3rd Place</span>
                  <span className="font-medium">{league.third_place_percentage}%</span>
                </div>
              </div>
            </div>

            {/* Mock Pick Import Info */}
            {(standalonePredictionCount ?? 0) > 0 && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Target className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      Mock pick Available
                      <Badge variant="secondary" className="text-xs">
                        {standalonePredictionCount} predictions
                      </Badge>
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      After joining, you can import your Mock pick predictions to this league!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* League Entry Fee Info Box */}
            <div className="bg-muted/50 border border-border rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-sm">League Entry Fee: {league.entry_fee} {league.currency}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    This amount is collected by your league admin outside the app. 
                    It goes directly to the prize pool managed by your league.
                  </p>
                </div>
              </div>
            </div>

            {/* GOALPICK Payment / Free Entry Section */}
            <div className="border-t pt-6">
              {feesWaived ? (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <Gift className="h-5 w-5 text-primary" />
                    <h4 className="font-semibold">Free Entry</h4>
                  </div>

                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm text-muted-foreground">App Access Fee</span>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          The platform fee has been waived for this league.
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-sm">Waived</Badge>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleJoin}
                    disabled={joinLeague.isPending}
                  >
                    {joinLeague.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Joining...
                      </>
                    ) : (
                      'Join League for Free'
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-3">
                    No payment required. You'll be added to the league instantly.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <h4 className="font-semibold">Pay to GOALPICK</h4>
                  </div>
                  
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm text-muted-foreground">App Access Fee</span>
                        <p className="text-xs text-muted-foreground mt-0.5">One-time fee to join this league</p>
                      </div>
                      {feeLoading ? (
                        <Skeleton className="h-8 w-20" />
                      ) : (
                        <span className="text-2xl font-bold">${platformFee?.amount} {platformFee?.currency}</span>
                      )}
                    </div>
                  </div>

                  <Button 
                    className="w-full" 
                    size="lg" 
                    onClick={handleJoin}
                    disabled={joinLeague.isPending || feeLoading}
                  >
                    {joinLeague.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      `Pay $${platformFee?.amount ?? 1} & Join League`
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-3">
                    You will only be charged ${platformFee?.amount ?? 1} {platformFee?.currency ?? 'USD'}. Secure payment via Stripe.
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Import Predictions Dialog */}
        {joinedLeagueId && (
          <ImportPredictionsDialog
            leagueId={joinedLeagueId}
            leagueName={league.name}
            open={showImportDialog}
            onOpenChange={setShowImportDialog}
            onComplete={handleImportComplete}
          />
        )}
      </div>
    </Layout>
  );
}
