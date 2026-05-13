import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Database, Shield, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  icon: typeof Database;
}

export function SystemHealthCheck() {
  const [isChecking, setIsChecking] = useState(false);
  const [checks, setChecks] = useState<HealthCheck[]>([]);

  const runHealthChecks = async () => {
    setIsChecking(true);
    const results: HealthCheck[] = [];

    try {
      // Check 1: Scoring trigger exists
      const { data: triggers } = await supabase
        .rpc('has_role', { _user_id: (await supabase.auth.getUser()).data.user?.id || '', _role: 'admin' });
      
      // We can't directly check trigger existence via RPC, so we'll check if scoring works
      // by looking for predictions with points_earned > 0
      const { data: scoredPredictions, count: scoredCount } = await supabase
        .from('predictions')
        .select('*', { count: 'exact', head: true })
        .gt('points_earned', 0);

      const { data: finishedMatches, count: finishedCount } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'finished');

      if ((finishedCount || 0) > 0 && (scoredCount || 0) > 0) {
        results.push({
          name: 'Scoring Trigger',
          status: 'pass',
          message: `${scoredCount} predictions have earned points`,
          icon: Zap,
        });
      } else if ((finishedCount || 0) > 0) {
        results.push({
          name: 'Scoring Trigger',
          status: 'warning',
          message: 'Finished matches exist but no points earned yet',
          icon: Zap,
        });
      } else {
        results.push({
          name: 'Scoring Trigger',
          status: 'pass',
          message: 'Ready (no finished matches yet)',
          icon: Zap,
        });
      }

      // Check 2: RLS policies on predictions
      const { error: rlsError } = await supabase
        .from('predictions')
        .select('id')
        .limit(1);

      results.push({
        name: 'RLS Policies',
        status: rlsError ? 'fail' : 'pass',
        message: rlsError ? `Error: ${rlsError.message}` : 'Predictions table accessible',
        icon: Shield,
      });

      // Check 3: Original predictions table
      const { error: originalError } = await supabase
        .from('original_predictions')
        .select('id')
        .limit(1);

      results.push({
        name: 'Original Predictions',
        status: originalError ? 'warning' : 'pass',
        message: originalError ? 'Table may not be accessible' : 'Mode B comparison ready',
        icon: Database,
      });

      // Check 4: Profile stats
      const { data: profileStats } = await supabase
        .from('profiles')
        .select('total_points, exact_score_count, correct_outcome_count')
        .limit(5);

      const hasStats = profileStats?.some(p => 
        (p.total_points || 0) > 0 || 
        (p.exact_score_count || 0) > 0 || 
        (p.correct_outcome_count || 0) > 0
      );

      if ((finishedCount || 0) > 0) {
        results.push({
          name: 'Profile Stats Sync',
          status: hasStats ? 'pass' : 'warning',
          message: hasStats ? 'Stats being updated' : 'No stats recorded yet',
          icon: Database,
        });
      } else {
        results.push({
          name: 'Profile Stats Sync',
          status: 'pass',
          message: 'Ready (awaiting finished matches)',
          icon: Database,
        });
      }

      // Check 5: Matches data
      const { count: matchCount } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true });

      results.push({
        name: 'Match Data',
        status: (matchCount || 0) > 0 ? 'pass' : 'fail',
        message: `${matchCount || 0} matches in database`,
        icon: Database,
      });

      setChecks(results);
      
      const passCount = results.filter(r => r.status === 'pass').length;
      const warnCount = results.filter(r => r.status === 'warning').length;
      const failCount = results.filter(r => r.status === 'fail').length;

      if (failCount > 0) {
        toast.error(`Health check: ${failCount} issue(s) found`);
      } else if (warnCount > 0) {
        toast.warning(`Health check: ${warnCount} warning(s)`);
      } else {
        toast.success('All systems operational');
      }

    } catch (error) {
      console.error('Health check error:', error);
      toast.error('Failed to run health checks');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button 
        onClick={runHealthChecks} 
        disabled={isChecking}
        className="w-full gap-2"
      >
        {isChecking ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" />
            Running checks...
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4" />
            Run Health Check
          </>
        )}
      </Button>

      {checks.length > 0 && (
        <div className="space-y-2">
          {checks.map((check, index) => (
            <div 
              key={index}
              className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
            >
              <div className="flex items-center gap-3">
                {check.status === 'pass' && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
                {check.status === 'warning' && (
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                )}
                {check.status === 'fail' && (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <div>
                  <p className="font-medium text-sm">{check.name}</p>
                  <p className="text-xs text-muted-foreground">{check.message}</p>
                </div>
              </div>
              <Badge 
                variant={
                  check.status === 'pass' ? 'default' : 
                  check.status === 'warning' ? 'secondary' : 
                  'destructive'
                }
              >
                {check.status}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {checks.length === 0 && (
        <p className="text-center text-muted-foreground text-sm py-4">
          Click "Run Health Check" to verify system status
        </p>
      )}
    </div>
  );
}
