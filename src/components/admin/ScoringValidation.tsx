import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, CheckCircle, XCircle, Trophy, Target } from 'lucide-react';

interface PredictionWithMatch {
  id: string;
  user_id: string;
  match_id: string;
  league_id: string | null;
  predicted_home_score: number;
  predicted_away_score: number;
  points_earned: number;
  match: {
    home_team: string;
    away_team: string;
    home_score: number | null;
    away_score: number | null;
    status: string | null;
    stage: string;
  } | null;
  profile: {
    display_name: string;
  } | null;
}

export function ScoringValidation() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-scoring-validation'],
    queryFn: async () => {
      // Get predictions with match and profile info for finished matches
      const { data: predictions, error } = await supabase
        .from('predictions')
        .select(`
          id,
          user_id,
          match_id,
          league_id,
          predicted_home_score,
          predicted_away_score,
          points_earned,
          match:matches!inner(
            home_team,
            away_team,
            home_score,
            away_score,
            status,
            stage
          )
        `)
        .limit(50);

      if (error) throw error;

      // Get profiles separately
      const userIds = [...new Set((predictions || []).map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);

      // Merge profiles
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      return (predictions || []).map(p => ({
        ...p,
        profile: profileMap.get(p.user_id) || null,
      })) as PredictionWithMatch[];
    },
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        Error loading predictions
      </div>
    );
  }

  const finishedPredictions = data?.filter(p => p.match?.status === 'finished') || [];
  const pendingPredictions = data?.filter(p => p.match?.status !== 'finished') || [];
  const scoredPredictions = finishedPredictions.filter(p => p.points_earned > 0);
  const unscoredPredictions = finishedPredictions.filter(p => p.points_earned === 0);

  return (
    <div className="space-y-4">
      {/* Stats summary */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="p-2 bg-muted/50 rounded">
          <p className="text-muted-foreground">Finished Matches</p>
          <p className="font-bold">{finishedPredictions.length}</p>
        </div>
        <div className="p-2 bg-muted/50 rounded">
          <p className="text-muted-foreground">Scored Predictions</p>
          <p className="font-bold text-green-600">{scoredPredictions.length}</p>
        </div>
      </div>

      {/* Recent scored predictions */}
      <div>
        <p className="text-sm font-medium mb-2">Recent Predictions</p>
        <ScrollArea className="h-48">
          <div className="space-y-2">
            {data?.slice(0, 20).map(pred => (
              <div 
                key={pred.id} 
                className="flex items-center justify-between p-2 bg-muted/30 rounded text-xs"
              >
                <div className="flex items-center gap-2">
                  {pred.match?.status === 'finished' ? (
                    pred.points_earned > 0 ? (
                      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-red-500" />
                    )
                  ) : (
                    <Target className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">
                      {pred.profile?.display_name || 'Unknown'}
                    </p>
                    <p className="text-muted-foreground">
                      {pred.match?.home_team} {pred.predicted_home_score}-{pred.predicted_away_score} {pred.match?.away_team}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {pred.match?.status === 'finished' ? (
                    <>
                      <p className="text-muted-foreground">
                        Actual: {pred.match.home_score}-{pred.match.away_score}
                      </p>
                      <Badge 
                        variant={pred.points_earned > 0 ? 'default' : 'outline'}
                        className="text-xs"
                      >
                        {pred.points_earned > 0 ? (
                          <><Trophy className="h-3 w-3 mr-1" />{pred.points_earned} pts</>
                        ) : (
                          '0 pts'
                        )}
                      </Badge>
                    </>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Pending</Badge>
                  )}
                </div>
              </div>
            ))}

            {(!data || data.length === 0) && (
              <p className="text-center text-muted-foreground py-4">
                No predictions found
              </p>
            )}
          </div>
        </ScrollArea>
      </div>

      {finishedPredictions.length > 0 && unscoredPredictions.length > 0 && (
        <div className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs">
          <p className="font-medium text-yellow-600">
            ⚠️ {unscoredPredictions.length} predictions for finished matches have 0 points.
          </p>
          <p className="text-muted-foreground">
            This may indicate incorrect predictions or a scoring trigger issue.
          </p>
        </div>
      )}
    </div>
  );
}
