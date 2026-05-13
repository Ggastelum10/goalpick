import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, Play, RotateCcw, Dices, AlertTriangle, Trash2 } from 'lucide-react';
import { Match } from '@/hooks/useMatches';

const STAGES = [
  { value: 'group', label: 'Group Phase', icon: '🏟️' },
  { value: 'round_of_32', label: 'Round of 32', icon: '32' },
  { value: 'round_of_16', label: 'Round of 16', icon: '16' },
  { value: 'quarter_final', label: 'Quarter Finals', icon: '8' },
  { value: 'semi_final', label: 'Semi Finals', icon: '4' },
  { value: 'third_place', label: 'Third Place', icon: '🥉' },
  { value: 'final', label: 'Final', icon: '🏆' },
];

const generateRandomScore = () => {
  // Weighted random to produce realistic scores (favoring 0-3 goals)
  const weights = [30, 30, 20, 10, 5, 3, 2]; // 0-6 goals
  const total = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * total;
  
  for (let i = 0; i < weights.length; i++) {
    random -= weights[i];
    if (random <= 0) return i;
  }
  return 0;
};

interface MatchSimulatorProps {
  matches: Match[];
}

export function MatchSimulator({ matches }: MatchSimulatorProps) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'simulate' | 'reset' | 'random'>('simulate');
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [homeScore, setHomeScore] = useState<string>('');
  const [awayScore, setAwayScore] = useState<string>('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetOptions, setResetOptions] = useState({
    predictions: true,
    profiles: true,
    matches: false,
  });
  const [dryRun, setDryRun] = useState(false);

  const selectedMatch = matches.find(m => m.id === selectedMatchId);
  
  // Filter matches based on mode
  const displayedMatches = mode === 'simulate'
    ? matches.filter(m => m.status === 'scheduled' || m.status === null)
    : matches.filter(m => m.status === 'finished');

  const handleModeChange = (newMode: 'simulate' | 'reset' | 'random') => {
    setMode(newMode);
    setSelectedMatchId('');
    setSelectedStage('');
    setHomeScore('');
    setAwayScore('');
  };

  // Get scheduled matches count for selected stage
  const getStageMatchCount = (stage: string) => {
    return matches.filter(m => m.stage === stage && (m.status === 'scheduled' || m.status === null)).length;
  };

  const handleRandomStageSimulation = async () => {
    if (!selectedStage) {
      toast.error('Please select a stage');
      return;
    }

    const stageMatches = matches.filter(
      m => m.stage === selectedStage && 
           (m.status === 'scheduled' || m.status === null)
    );

    if (stageMatches.length === 0) {
      toast.error('No scheduled matches in this stage');
      return;
    }

    setIsSimulating(true);
    let successCount = 0;
    let errorCount = 0;

    for (const match of stageMatches) {
      try {
        const homeScore = generateRandomScore();
        const awayScore = generateRandomScore();

        const { error } = await supabase
          .from('matches')
          .update({
            home_score: homeScore,
            away_score: awayScore,
            // Use 'live' for dry run to show scores without triggering scoring
            status: dryRun ? 'live' : 'finished',
          })
          .eq('id', match.id);

        if (error) throw error;
        successCount++;
      } catch (error) {
        console.error(`Failed to simulate ${match.home_team} vs ${match.away_team}:`, error);
        errorCount++;
      }
    }

    // Invalidate all relevant queries
    await queryClient.invalidateQueries({ queryKey: ['admin-scoring-validation'] });
    await queryClient.invalidateQueries({ queryKey: ['matches'] });
    await queryClient.invalidateQueries({ queryKey: ['leaderboard'] });

    const stageName = STAGES.find(s => s.value === selectedStage)?.label || selectedStage;
    if (errorCount === 0) {
      const message = dryRun 
        ? `Dry run: Simulated ${successCount} matches in ${stageName} (no points calculated)`
        : `Simulated ${successCount} matches in ${stageName}`;
      toast.success(message);
    } else {
      toast.warning(`Simulated ${successCount} matches, ${errorCount} failed`);
    }

    setSelectedStage('');
    setIsSimulating(false);
  };

  const handleSimulate = async () => {
    if (!selectedMatchId || homeScore === '' || awayScore === '') {
      toast.error('Please select a match and enter both scores');
      return;
    }

    setIsSimulating(true);
    try {
      const { error } = await supabase
        .from('matches')
        .update({
          home_score: parseInt(homeScore),
          away_score: parseInt(awayScore),
          status: 'finished',
        })
        .eq('id', selectedMatchId);

      if (error) throw error;

      // Invalidate queries to refresh UI
      await queryClient.invalidateQueries({ queryKey: ['admin-scoring-validation'] });
      await queryClient.invalidateQueries({ queryKey: ['matches'] });
      await queryClient.invalidateQueries({ queryKey: ['leaderboard'] });

      toast.success(
        `Match simulated: ${selectedMatch?.home_team} ${homeScore} - ${awayScore} ${selectedMatch?.away_team}. ` +
        'Scoring trigger should have fired - check predictions for points.'
      );

      setSelectedMatchId('');
      setHomeScore('');
      setAwayScore('');
    } catch (error) {
      console.error('Simulation error:', error);
      toast.error('Failed to simulate match result');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleResetMatch = async () => {
    if (!selectedMatchId) {
      toast.error('Please select a match first');
      return;
    }

    setIsSimulating(true);
    try {
      const { error } = await supabase
        .from('matches')
        .update({
          home_score: null,
          away_score: null,
          status: 'scheduled',
        })
        .eq('id', selectedMatchId);

      if (error) throw error;

      // Invalidate queries to refresh UI
      await queryClient.invalidateQueries({ queryKey: ['admin-scoring-validation'] });
      await queryClient.invalidateQueries({ queryKey: ['matches'] });
      await queryClient.invalidateQueries({ queryKey: ['leaderboard'] });

      toast.success(`Match reset to scheduled: ${selectedMatch?.home_team} vs ${selectedMatch?.away_team}`);
      setSelectedMatchId('');
    } catch (error) {
      console.error('Reset error:', error);
      toast.error('Failed to reset match');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleResetTestData = async () => {
    setIsResetting(true);
    const errors: string[] = [];

    try {
      // Reset predictions (delete all)
      if (resetOptions.predictions) {
        const { error } = await supabase
          .from('predictions')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) errors.push('predictions');
      }

      // Reset profile statistics
      if (resetOptions.profiles) {
        const { error } = await supabase
          .from('profiles')
          .update({
            total_points: 0,
            exact_score_count: 0,
            correct_outcome_count: 0,
            goal_difference_accuracy: 0,
          })
          .neq('user_id', '00000000-0000-0000-0000-000000000000');
        if (error) errors.push('profiles');
      }

      // Reset matches to scheduled
      if (resetOptions.matches) {
        const { error } = await supabase
          .from('matches')
          .update({
            home_score: null,
            away_score: null,
            status: 'scheduled',
          })
          .neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) errors.push('matches');
      }

      // Invalidate all relevant queries
      await queryClient.invalidateQueries({ queryKey: ['predictions'] });
      await queryClient.invalidateQueries({ queryKey: ['userPredictions'] });
      await queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      await queryClient.invalidateQueries({ queryKey: ['matches'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-scoring-validation'] });

      if (errors.length === 0) {
        toast.success('Test data reset successfully!');
      } else {
        toast.warning(`Reset completed with errors: ${errors.join(', ')}`);
      }
    } catch (error) {
      console.error('Reset error:', error);
      toast.error('Failed to reset test data');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex gap-2 flex-wrap">
        <Button 
          variant={mode === 'simulate' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleModeChange('simulate')}
        >
          <Play className="h-4 w-4 mr-1" /> Simulate
        </Button>
        <Button 
          variant={mode === 'reset' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleModeChange('reset')}
        >
          <RotateCcw className="h-4 w-4 mr-1" /> Reset
        </Button>
        <Button 
          variant={mode === 'random' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleModeChange('random')}
        >
          <Dices className="h-4 w-4 mr-1" /> Random Stage
        </Button>
      </div>

      {/* Mode-specific content */}
      {mode === 'random' ? (
        <>
          <div className="space-y-2">
            <Label>Select Stage to Simulate</Label>
            <Select value={selectedStage} onValueChange={setSelectedStage}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a tournament stage..." />
              </SelectTrigger>
              <SelectContent>
                {STAGES.map(stage => {
                  const count = getStageMatchCount(stage.value);
                  return (
                    <SelectItem key={stage.value} value={stage.value} disabled={count === 0}>
                      <span className="flex items-center gap-2">
                        <span>{stage.icon}</span>
                        <span>{stage.label}</span>
                        <Badge variant={count > 0 ? 'secondary' : 'outline'} className="text-xs ml-2">
                          {count} match{count !== 1 ? 'es' : ''}
                        </Badge>
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {selectedStage && (
            <>
              <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                <p className="text-sm font-medium">
                  {STAGES.find(s => s.value === selectedStage)?.icon} {STAGES.find(s => s.value === selectedStage)?.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {getStageMatchCount(selectedStage)} scheduled match{getStageMatchCount(selectedStage) !== 1 ? 'es' : ''} will be simulated with random scores
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="dry-run"
                  checked={dryRun}
                  onCheckedChange={(checked) => setDryRun(!!checked)}
                />
                <Label htmlFor="dry-run" className="text-sm">
                  Dry run (no scoring - only test UI display)
                </Label>
              </div>

              <Alert variant="destructive" className="bg-amber-500/10 border-amber-500/30">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <AlertDescription className="text-amber-600 dark:text-amber-400 text-xs">
                  {dryRun 
                    ? "Dry run mode: Matches will show scores but NO points will be calculated. Status will be 'live' instead of 'finished'."
                    : "This will simulate all scheduled matches in this stage with random scores. This action triggers scoring calculations."}
                </AlertDescription>
              </Alert>
            </>
          )}
        </>
      ) : (
        <>
          <div className="space-y-2">
            <Label>
              {mode === 'simulate' ? 'Select Match to Simulate' : 'Select Finished Match to Reset'}
            </Label>
            <Select value={selectedMatchId} onValueChange={setSelectedMatchId}>
              <SelectTrigger>
                <SelectValue placeholder={mode === 'simulate' ? 'Choose a match to simulate...' : 'Choose a finished match to reset...'} />
              </SelectTrigger>
              <SelectContent>
                {displayedMatches.length === 0 ? (
                  <SelectItem value="none" disabled>
                    {mode === 'simulate' ? 'No scheduled matches' : 'No finished matches'}
                  </SelectItem>
                ) : (
                  displayedMatches.map(match => (
                    <SelectItem key={match.id} value={match.id}>
                      <span className="flex items-center gap-2">
                        {match.home_team} {mode === 'reset' && match.home_score !== null ? `${match.home_score} - ${match.away_score}` : 'vs'} {match.away_team}
                        <Badge variant="outline" className="text-xs">
                          {match.stage}
                        </Badge>
                      </span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Show match info based on mode */}
          {selectedMatch && mode === 'simulate' && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">
                {selectedMatch.home_team} vs {selectedMatch.away_team}
              </p>
              <p className="text-xs text-muted-foreground">
                {selectedMatch.stage} • {selectedMatch.group_name || 'Knockout'}
              </p>
            </div>
          )}

          {selectedMatch && mode === 'reset' && (
            <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
              <p className="text-sm font-medium">
                {selectedMatch.home_team} {selectedMatch.home_score} - {selectedMatch.away_score} {selectedMatch.away_team}
              </p>
              <p className="text-xs text-muted-foreground">
                This match will be reset to scheduled status
              </p>
            </div>
          )}

          {/* Score inputs only in simulate mode */}
          {mode === 'simulate' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Home Score</Label>
                <Input
                  type="number"
                  min="0"
                  max="20"
                  value={homeScore}
                  onChange={(e) => setHomeScore(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Away Score</Label>
                <Input
                  type="number"
                  min="0"
                  max="20"
                  value={awayScore}
                  onChange={(e) => setAwayScore(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Action buttons based on mode */}
      {mode === 'simulate' && (
        <Button 
          onClick={handleSimulate} 
          disabled={isSimulating || !selectedMatchId}
          className="w-full gap-2"
        >
          {isSimulating ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Simulate Result
        </Button>
      )}

      {mode === 'reset' && (
        <Button 
          onClick={handleResetMatch} 
          variant="destructive"
          disabled={isSimulating || !selectedMatchId}
          className="w-full gap-2"
        >
          {isSimulating ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="h-4 w-4" />
          )}
          Reset to Scheduled
        </Button>
      )}

      {mode === 'random' && (
        <Button 
          onClick={handleRandomStageSimulation} 
          disabled={isSimulating || !selectedStage}
          className="w-full gap-2"
        >
          {isSimulating ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Dices className="h-4 w-4" />
          )}
          Simulate Stage ({getStageMatchCount(selectedStage)} matches)
        </Button>
      )}

      <p className="text-xs text-muted-foreground">
        {mode === 'simulate' && 'Simulating a match result will trigger the scoring function and update all predictions\' points_earned values.'}
        {mode === 'reset' && 'Resetting a match will clear scores and change status back to scheduled. Points may need recalculation.'}
        {mode === 'random' && 'Random simulation generates realistic scores (0-6 goals, weighted towards lower scores) for all scheduled matches in the selected stage.'}
      </p>

      <Separator className="my-6" />

      <div className="space-y-4">
        <h4 className="font-medium flex items-center gap-2">
          <Trash2 className="h-4 w-4" />
          Reset Test Data
        </h4>

        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="reset-predictions"
              checked={resetOptions.predictions}
              onCheckedChange={(checked) =>
                setResetOptions(prev => ({ ...prev, predictions: !!checked }))
              }
            />
            <Label htmlFor="reset-predictions" className="text-sm">
              Delete all predictions
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="reset-profiles"
              checked={resetOptions.profiles}
              onCheckedChange={(checked) =>
                setResetOptions(prev => ({ ...prev, profiles: !!checked }))
              }
            />
            <Label htmlFor="reset-profiles" className="text-sm">
              Reset profile statistics (points, counts)
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="reset-matches"
              checked={resetOptions.matches}
              onCheckedChange={(checked) =>
                setResetOptions(prev => ({ ...prev, matches: !!checked }))
              }
            />
            <Label htmlFor="reset-matches" className="text-sm">
              Reset all matches to scheduled
            </Label>
          </div>
        </div>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            This action cannot be undone. All selected data will be permanently deleted or reset.
          </AlertDescription>
        </Alert>

        <Button
          variant="destructive"
          onClick={handleResetTestData}
          disabled={isResetting || (!resetOptions.predictions && !resetOptions.profiles && !resetOptions.matches)}
          className="w-full gap-2"
        >
          {isResetting ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          Reset Selected Data
        </Button>
      </div>
    </div>
  );
}
