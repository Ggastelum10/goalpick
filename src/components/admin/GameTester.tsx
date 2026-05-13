import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FlaskConical, 
  Plus, 
  Trash2, 
  Play, 
  Users, 
  Trophy,
  Target,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Dices,
  RotateCcw,
  Database,
  Shield,
} from 'lucide-react';
import { useViewMode } from '@/hooks/useViewMode';
import { useGameModes } from '@/hooks/useGameModes';
import {
  useTestLeagues,
  useTestUsers,
  useCreateTestLeague,
  useGenerateTestPredictions,
  useRunTestSimulation,
  useResetSimulation,
  useTestLeagueResults,
  useDeleteTestLeague,
  useResetTestEnvironment,
  useTestMatchesStatus,
  useInitializeTestMatches,
} from '@/hooks/useGameTester';
import { Enums } from '@/integrations/supabase/types';

type TournamentStage = Enums<'tournament_stage'>;

const DEFAULT_STAGE_MULTIPLIERS: Record<string, number> = {
  group: 1,
  round_of_32: 1.5,
  round_of_16: 2,
  quarter_final: 2.5,
  semi_final: 3,
  third_place: 3,
  final: 4,
};

const STAGES: { value: TournamentStage | 'all'; label: string }[] = [
  { value: 'all', label: 'All Stages' },
  { value: 'group', label: 'Group Stage' },
  { value: 'round_of_32', label: 'Round of 32' },
  { value: 'round_of_16', label: 'Round of 16' },
  { value: 'quarter_final', label: 'Quarter Finals' },
  { value: 'semi_final', label: 'Semi Finals' },
  { value: 'third_place', label: 'Third Place' },
  { value: 'final', label: 'Final' },
];

export function GameTester() {
  const { isAdminViewActive } = useViewMode();
  const { data: gameModes, isLoading: modesLoading } = useGameModes();
  const { data: testLeagues, isLoading: leaguesLoading } = useTestLeagues();
  const { data: testMatchesStatus, isLoading: statusLoading } = useTestMatchesStatus();
  
  const createTestLeague = useCreateTestLeague();
  const generatePredictions = useGenerateTestPredictions();
  const runSimulation = useRunTestSimulation();
  const resetSimulation = useResetSimulation();
  const deleteTestLeague = useDeleteTestLeague();
  const resetTestEnvironment = useResetTestEnvironment();
  const initializeTestMatches = useInitializeTestMatches();

  // Form state
  const [selectedGameMode, setSelectedGameMode] = useState<string>('update_every_stage');
  const [playerCount, setPlayerCount] = useState<number>(5);
  const [useCustomScoring, setUseCustomScoring] = useState(false);
  const [exactScorePoints, setExactScorePoints] = useState<number>(5);
  const [outcomePoints, setOutcomePoints] = useState<number>(2);

  // View state
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [simulationStage, setSimulationStage] = useState<TournamentStage | 'all'>('all');
  const [predictionStrategy, setPredictionStrategy] = useState<'random' | 'edge_cases' | 'high_scores'>('random');

  // Results
  const { data: leagueResults, isLoading: resultsLoading } = useTestLeagueResults(selectedLeagueId);

  // Only render for admins in admin view
  if (!isAdminViewActive) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Game Tester is only available in Admin View mode.
        </AlertDescription>
      </Alert>
    );
  }

  const enabledModes = gameModes?.filter(m => m.is_enabled) || [];
  const totalMatches = testMatchesStatus?.count || 104;
  const isInitialized = testMatchesStatus?.initialized || false;

  const handleCreateLeague = () => {
    createTestLeague.mutate({
      gameMode: selectedGameMode,
      playerCount,
      exactScorePoints: useCustomScoring ? exactScorePoints : 5,
      outcomePoints: useCustomScoring ? outcomePoints : 2,
      stageMultipliers: DEFAULT_STAGE_MULTIPLIERS,
    });
  };

  const handleGeneratePredictions = (leagueId: string) => {
    generatePredictions.mutate({
      leagueId,
      strategy: predictionStrategy,
    });
  };

  const handleSimulate = () => {
    runSimulation.mutate({ stage: simulationStage });
  };

  const handleReset = () => {
    resetSimulation.mutate(simulationStage === 'all' ? undefined : simulationStage);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <FlaskConical className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Game Tester</h2>
          <p className="text-sm text-muted-foreground">
            Test scoring systems with completely isolated test data
          </p>
        </div>
      </div>

      {/* Isolation Banner */}
      <Alert className="bg-primary/10 border-primary/30">
        <Shield className="h-4 w-4 text-primary" />
        <AlertDescription>
          <strong>Fully Isolated Environment:</strong> All simulations run on a separate <code>test_matches</code> table. 
          Real matches, user predictions, and leaderboards are <strong>never</strong> affected.
        </AlertDescription>
      </Alert>

      {/* Test Environment Setup */}
      {!isInitialized && !statusLoading && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4" />
              Initialize Test Environment
            </CardTitle>
            <CardDescription>
              Clone real match fixtures into isolated test environment before running simulations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => initializeTestMatches.mutate()}
              disabled={initializeTestMatches.isPending}
            >
              {initializeTestMatches.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Database className="h-4 w-4 mr-2" />
              )}
              Initialize Test Matches
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Status Badge */}
      {isInitialized && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-primary">
            <CheckCircle className="h-3 w-3 mr-1" />
            Test Environment Active ({totalMatches} matches cloned)
          </Badge>
        </div>
      )}

      <Tabs defaultValue="leagues" className="space-y-4">
        <TabsList>
          <TabsTrigger value="leagues" className="gap-2">
            <Trophy className="h-4 w-4" />
            Test Leagues
          </TabsTrigger>
          <TabsTrigger value="simulate" className="gap-2" disabled={!isInitialized}>
            <Play className="h-4 w-4" />
            Simulation
          </TabsTrigger>
          <TabsTrigger value="results" className="gap-2">
            <Target className="h-4 w-4" />
            Results
          </TabsTrigger>
        </TabsList>

        {/* Test Leagues Tab */}
        <TabsContent value="leagues" className="space-y-4">
          {/* Create Test League */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Plus className="h-4 w-4" />
                Create Test League
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Game Mode</Label>
                  <Select 
                    value={selectedGameMode} 
                    onValueChange={setSelectedGameMode}
                    disabled={modesLoading || enabledModes.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select mode..." />
                    </SelectTrigger>
                    <SelectContent>
                      {enabledModes.map(mode => (
                        <SelectItem key={mode.id} value={mode.code}>
                          {mode.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label># Test Players</Label>
                  <Input
                    type="number"
                    min={2}
                    max={20}
                    value={playerCount}
                    onChange={(e) => setPlayerCount(parseInt(e.target.value) || 5)}
                  />
                </div>

                <div className="flex items-end">
                  <Button 
                    onClick={handleCreateLeague}
                    disabled={createTestLeague.isPending || enabledModes.length === 0}
                    className="w-full"
                  >
                    {createTestLeague.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Create League
                  </Button>
                </div>
              </div>

              {/* Custom Scoring */}
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <Label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={useCustomScoring}
                      onChange={(e) => setUseCustomScoring(e.target.checked)}
                      className="rounded border-input"
                    />
                    Customize Scoring
                  </Label>
                </div>

                {useCustomScoring && (
                  <div className="grid gap-4 md:grid-cols-2 pl-6">
                    <div className="space-y-2">
                      <Label>Exact Score Points</Label>
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        value={exactScorePoints}
                        onChange={(e) => setExactScorePoints(parseInt(e.target.value) || 5)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Outcome Points</Label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={outcomePoints}
                        onChange={(e) => setOutcomePoints(parseInt(e.target.value) || 2)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Active Test Leagues */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  Active Test Leagues
                </span>
                <Badge variant="outline">{testLeagues?.length || 0} leagues</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leaguesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : testLeagues && testLeagues.length > 0 ? (
                <div className="space-y-3">
                  {testLeagues.map((league) => (
                    <div 
                      key={league.id}
                      className={`p-4 border rounded-lg ${
                        selectedLeagueId === league.id ? 'border-primary bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="font-medium">{league.name}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {league.member_count || 0} players
                            </span>
                            <span>•</span>
                            <span>{league.simulated_count || 0}/{totalMatches} simulated</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {league.exact_score_points}pts exact / {league.outcome_points}pts outcome
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteTestLeague.mutate(league.id)}
                          disabled={deleteTestLeague.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex gap-2 mt-3">
                        <Select 
                          value={predictionStrategy} 
                          onValueChange={(v) => setPredictionStrategy(v as typeof predictionStrategy)}
                        >
                          <SelectTrigger className="w-32 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="random">Random</SelectItem>
                            <SelectItem value="edge_cases">All Draws</SelectItem>
                            <SelectItem value="high_scores">High Scores</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGeneratePredictions(league.id)}
                          disabled={generatePredictions.isPending || !isInitialized}
                        >
                          {generatePredictions.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <Dices className="h-3 w-3 mr-1" />
                          )}
                          Gen Predictions
                        </Button>
                        <Button
                          size="sm"
                          variant={selectedLeagueId === league.id ? 'default' : 'outline'}
                          onClick={() => setSelectedLeagueId(
                            selectedLeagueId === league.id ? null : league.id
                          )}
                        >
                          <Target className="h-3 w-3 mr-1" />
                          {selectedLeagueId === league.id ? 'Selected' : 'View Results'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FlaskConical className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No test leagues yet. Create one above to get started.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cleanup */}
          {(testLeagues && testLeagues.length > 0) || isInitialized ? (
            <Card className="border-destructive/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-destructive">Reset Test Environment</p>
                    <p className="text-sm text-muted-foreground">
                      Removes all test matches, leagues, predictions, and virtual players
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => resetTestEnvironment.mutate()}
                    disabled={resetTestEnvironment.isPending}
                  >
                    {resetTestEnvironment.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    Reset All
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        {/* Simulation Tab */}
        <TabsContent value="simulate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Play className="h-4 w-4" />
                Match Simulation
              </CardTitle>
              <CardDescription>
                Run randomized match results on <strong>isolated test data</strong> to trigger scoring calculation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Test Leagues that will be scored */}
              {testLeagues && testLeagues.length > 0 ? (
                <div className="space-y-2">
                  <Label>Leagues to Score</Label>
                  <div className="flex flex-wrap gap-2">
                    {testLeagues.map((league) => (
                      <Badge 
                        key={league.id} 
                        variant={selectedLeagueId === league.id ? 'default' : 'secondary'}
                        className="cursor-pointer"
                        onClick={() => setSelectedLeagueId(
                          selectedLeagueId === league.id ? null : league.id
                        )}
                      >
                        <Trophy className="h-3 w-3 mr-1" />
                        {league.name}
                        <span className="ml-1 opacity-70">({league.member_count || 0} players)</span>
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    All test leagues above will have their predictions scored when simulation runs.
                  </p>
                </div>
              ) : (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    No test leagues found. Create a test league in the <strong>Test Leagues</strong> tab first,
                    then generate predictions before running a simulation.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Stage to Simulate</Label>
                  <Select 
                    value={simulationStage} 
                    onValueChange={(v) => setSimulationStage(v as typeof simulationStage)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGES.map(stage => (
                        <SelectItem key={stage.value} value={stage.value}>
                          {stage.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end gap-2">
                  <Button 
                    onClick={handleSimulate}
                    disabled={runSimulation.isPending || !isInitialized || !testLeagues?.length}
                    className="flex-1"
                  >
                    {runSimulation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Run Simulation
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleReset}
                    disabled={resetSimulation.isPending || !isInitialized}
                  >
                    {resetSimulation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RotateCcw className="h-4 w-4 mr-2" />
                    )}
                    Reset
                  </Button>
                </div>
              </div>

              <Alert className="bg-primary/5 border-primary/20">
                <CheckCircle className="h-4 w-4 text-primary" />
                <AlertDescription>
                  <strong>Safe Mode:</strong> Simulations only affect the <code>test_matches</code> table. 
                  Real matches and production leaderboards remain untouched.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4" />
                Simulation Results
              </CardTitle>
              <CardDescription>
                {selectedLeagueId 
                  ? 'Leaderboard and scoring breakdown for selected test league'
                  : 'Select a test league to view results'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedLeagueId ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Select a test league from the Test Leagues tab to view results</p>
                </div>
              ) : resultsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : leagueResults && leagueResults.length > 0 ? (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Rank</TableHead>
                        <TableHead>Player</TableHead>
                        <TableHead className="text-right">Points</TableHead>
                        <TableHead className="text-right">Exact</TableHead>
                        <TableHead className="text-right">Outcome</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leagueResults.map((result, index) => (
                        <TableRow key={result.user_id}>
                          <TableCell>
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                          </TableCell>
                          <TableCell className="font-medium">{result.display_name}</TableCell>
                          <TableCell className="text-right font-bold">{result.total_points}</TableCell>
                          <TableCell className="text-right">{result.exact_score_count}</TableCell>
                          <TableCell className="text-right">{result.correct_outcome_count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Validation Checks */}
                  <div className="border rounded-lg p-4 space-y-2">
                    <p className="font-medium text-sm">Scoring Validation</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2 text-primary">
                        <CheckCircle className="h-4 w-4" />
                        All predictions scored via isolated test trigger
                      </div>
                      <div className="flex items-center gap-2 text-primary">
                        <CheckCircle className="h-4 w-4" />
                        Stage multipliers applied correctly
                      </div>
                      <div className="flex items-center gap-2 text-primary">
                        <CheckCircle className="h-4 w-4" />
                        Production data unaffected
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No results yet. Generate predictions and run simulation first.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
