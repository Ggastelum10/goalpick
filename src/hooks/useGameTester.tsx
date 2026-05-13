import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tables, Enums } from '@/integrations/supabase/types';

type League = Tables<'leagues'>;
type TournamentStage = Enums<'tournament_stage'>;

interface TestMatch {
  id: string;
  match_date: string | null;
  home_team: string;
  away_team: string;
  home_team_flag: string | null;
  away_team_flag: string | null;
  home_score: number | null;
  away_score: number | null;
  stage: TournamentStage;
  group_name: string | null;
  status: 'scheduled' | 'live' | 'finished' | 'postponed' | null;
  source_match_id: string | null;
  created_at: string | null;
}

interface TestLeague extends League {
  member_count?: number;
  simulated_count?: number;
}

interface TestUserProfile {
  id: string;
  display_name: string;
  avatar_seed: number;
  created_at: string;
}

interface TestLeagueResult {
  user_id: string;
  display_name: string;
  total_points: number;
  exact_score_count: number;
  correct_outcome_count: number;
}

interface CreateTestLeagueParams {
  gameMode: string;
  playerCount: number;
  exactScorePoints: number;
  outcomePoints: number;
  stageMultipliers: Record<string, number>;
}

interface GeneratePredictionsParams {
  leagueId: string;
  strategy: 'random' | 'edge_cases' | 'high_scores';
}

interface SimulationParams {
  stage: TournamentStage | 'all';
}

// Helper to get supabase client with explicit table typing for test_matches
// Since test_matches is new and types.ts hasn't regenerated yet
const getTestMatchesTable = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any).from('test_matches');
};

// Helper function to generate weighted random score (favoring 0-3)
function generateWeightedScore(): number {
  const weights = [25, 30, 25, 12, 5, 2, 1]; // 0, 1, 2, 3, 4, 5, 6
  const total = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * total;
  
  for (let i = 0; i < weights.length; i++) {
    random -= weights[i];
    if (random <= 0) return i;
  }
  return 0;
}

// Generate random penalty score for knockout draws
function generatePenaltyScore(): { home: number; away: number } {
  const home = Math.floor(Math.random() * 6) + 2; // 2-7
  let away = Math.floor(Math.random() * 6) + 2;
  // Ensure they're different
  while (away === home) {
    away = Math.floor(Math.random() * 6) + 2;
  }
  return { home, away };
}

// Check if test matches are initialized
export function useTestMatchesStatus() {
  return useQuery({
    queryKey: ['test-matches-status'],
    queryFn: async () => {
      const { count, error } = await getTestMatchesTable()
        .select('id', { count: 'exact', head: true });

      if (error) throw error;
      return { initialized: (count || 0) > 0, count: count || 0 };
    },
  });
}

// Initialize test matches by cloning from real matches
export function useInitializeTestMatches() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Check if already initialized
      const { count } = await getTestMatchesTable()
        .select('id', { count: 'exact', head: true });

      if (count && count > 0) {
        return { cloned: 0, message: 'Test matches already initialized' };
      }

      // Get all real matches
      const { data: realMatches, error: matchesError } = await supabase
        .from('matches')
        .select('*')
        .order('match_date', { ascending: true });

      if (matchesError) throw matchesError;

      // Clone matches into test_matches
      const testMatches = (realMatches || []).map(m => ({
        match_date: m.match_date,
        home_team: m.home_team,
        away_team: m.away_team,
        home_team_flag: m.home_team_flag,
        away_team_flag: m.away_team_flag,
        stage: m.stage,
        group_name: m.group_name,
        status: 'scheduled',
        source_match_id: m.id,
      }));

      const { error } = await getTestMatchesTable().insert(testMatches);

      if (error) throw error;
      return { cloned: testMatches.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['test-matches-status'] });
      queryClient.invalidateQueries({ queryKey: ['test-matches'] });
      if (data.cloned > 0) {
        toast.success(`Initialized ${data.cloned} test matches!`);
      } else {
        toast.info(data.message || 'Already initialized');
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to initialize: ${error.message}`);
    },
  });
}

// Fetch test matches
export function useTestMatches(stage?: TournamentStage) {
  return useQuery({
    queryKey: ['test-matches', stage],
    queryFn: async () => {
      let query = getTestMatchesTable()
        .select('*')
        .order('match_date', { ascending: true });

      if (stage) {
        query = query.eq('stage', stage);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TestMatch[];
    },
  });
}

// Fetch all test leagues
export function useTestLeagues() {
  return useQuery({
    queryKey: ['test-leagues'],
    queryFn: async () => {
      const { data: leagues, error } = await supabase
        .from('leagues')
        .select('*')
        .eq('is_test', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get simulation progress from test_matches
      const { count: simulatedCount } = await getTestMatchesTable()
        .select('id', { count: 'exact', head: true })
        .eq('status', 'finished');

      // Get member counts for each league
      const enrichedLeagues: TestLeague[] = await Promise.all(
        (leagues || []).map(async (league) => {
          // Count unique test users with predictions in this league
          const { data: predictions } = await supabase
            .from('predictions')
            .select('user_id')
            .eq('league_id', league.id);

          const uniqueUsers = new Set(predictions?.map(p => p.user_id) || []);

          return {
            ...league,
            member_count: uniqueUsers.size,
            simulated_count: simulatedCount || 0,
          };
        })
      );

      return enrichedLeagues;
    },
  });
}

// Fetch test user profiles
export function useTestUsers() {
  return useQuery({
    queryKey: ['test-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_user_profiles')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as TestUserProfile[];
    },
  });
}

// Create test league with virtual players
export function useCreateTestLeague() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateTestLeagueParams) => {
      const { gameMode, playerCount, exactScorePoints, outcomePoints, stageMultipliers } = params;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Count existing test leagues for naming
      const { count } = await supabase
        .from('leagues')
        .select('id', { count: 'exact', head: true })
        .eq('is_test', true);

      const leagueNumber = (count || 0) + 1;
      const modeName = gameMode === 'start_to_finish' ? 'Full Tournament' : 'Phase-by-Phase';

      // Create the test league
      const { data: league, error: leagueError } = await supabase
        .from('leagues')
        .insert({
          name: `Test League #${leagueNumber} (${modeName})`,
          owner_id: user.id,
          prediction_mode: gameMode,
          exact_score_points: exactScorePoints,
          outcome_points: outcomePoints,
          stage_multipliers: stageMultipliers,
          is_test: true,
          entry_fee: 0,
          is_public: false,
        })
        .select()
        .single();

      if (leagueError) throw leagueError;

      // Create test user profiles
      const testUsers: { display_name: string; avatar_seed: number }[] = [];
      for (let i = 1; i <= playerCount; i++) {
        testUsers.push({
          display_name: `TestBot-${i}`,
          avatar_seed: Math.floor(Math.random() * 100),
        });
      }

      const { data: createdUsers, error: usersError } = await supabase
        .from('test_user_profiles')
        .insert(testUsers)
        .select();

      if (usersError) throw usersError;

      return { league, testUsers: createdUsers };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-leagues'] });
      queryClient.invalidateQueries({ queryKey: ['test-users'] });
      toast.success('Test league created with virtual players!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create test league: ${error.message}`);
    },
  });
}

// Generate predictions for test users using source_match_id
export function useGenerateTestPredictions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: GeneratePredictionsParams) => {
      const { leagueId, strategy } = params;

      // Get test users
      const { data: testUsers, error: usersError } = await supabase
        .from('test_user_profiles')
        .select('*');

      if (usersError) throw usersError;
      if (!testUsers || testUsers.length === 0) {
        throw new Error('No test users found. Create a test league first.');
      }

      // Get test matches (which have source_match_id links)
      const { data: testMatches, error: matchesError } = await getTestMatchesTable()
        .select('*')
        .order('match_date', { ascending: true });

      if (matchesError) throw matchesError;
      
      const typedTestMatches = testMatches as TestMatch[];
      
      if (!typedTestMatches || typedTestMatches.length === 0) {
        throw new Error('No test matches found. Initialize test environment first.');
      }

      // Generate predictions for each test user for each match
      // Predictions reference source_match_id (real match) so trigger can find them
      const predictions: {
        user_id: string;
        match_id: string;
        league_id: string;
        predicted_home_score: number;
        predicted_away_score: number;
        predicted_home_penalty?: number;
        predicted_away_penalty?: number;
      }[] = [];

      for (const user of testUsers) {
        for (const match of typedTestMatches) {
          if (!match.source_match_id) continue;

          let homeScore: number;
          let awayScore: number;

          if (strategy === 'edge_cases') {
            // All draws for penalty testing
            homeScore = awayScore = Math.floor(Math.random() * 3) + 1;
          } else if (strategy === 'high_scores') {
            // High scoring matches
            homeScore = Math.floor(Math.random() * 4) + 3; // 3-6
            awayScore = Math.floor(Math.random() * 4) + 2; // 2-5
          } else {
            // Random weighted
            homeScore = generateWeightedScore();
            awayScore = generateWeightedScore();
          }

          const prediction: typeof predictions[0] = {
            user_id: user.id,
            match_id: match.source_match_id, // Use REAL match ID for predictions
            league_id: leagueId,
            predicted_home_score: homeScore,
            predicted_away_score: awayScore,
          };

          // Add penalty predictions for knockout draws
          if (match.stage !== 'group' && homeScore === awayScore) {
            const penalties = generatePenaltyScore();
            prediction.predicted_home_penalty = penalties.home;
            prediction.predicted_away_penalty = penalties.away;
          }

          predictions.push(prediction);
        }
      }

      // Delete existing predictions for this league first
      // We need to delete in smaller batches by user to ensure RLS allows it
      const { data: existingPreds } = await supabase
        .from('predictions')
        .select('id')
        .eq('league_id', leagueId);

      if (existingPreds && existingPreds.length > 0) {
        const deleteIds = existingPreds.map(p => p.id);
        const deleteBatchSize = 100;
        for (let i = 0; i < deleteIds.length; i += deleteBatchSize) {
          const batch = deleteIds.slice(i, i + deleteBatchSize);
          const { error: deleteError } = await supabase
            .from('predictions')
            .delete()
            .in('id', batch);

          if (deleteError) throw new Error(`Failed to clear existing predictions: ${deleteError.message}`);
        }
      }

      // Insert new predictions in batches
      const batchSize = 100;
      for (let i = 0; i < predictions.length; i += batchSize) {
        const batch = predictions.slice(i, i + batchSize);
        const { error } = await supabase
          .from('predictions')
          .insert(batch);

        if (error) throw error;
      }

      return { count: predictions.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['test-leagues'] });
      toast.success(`Generated ${data.count} predictions!`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to generate predictions: ${error.message}`);
    },
  });
}

// Run match simulation on TEST_MATCHES table (not real matches)
export function useRunTestSimulation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SimulationParams) => {
      const { stage } = params;

      // Query TEST_MATCHES instead of real matches
      let query = getTestMatchesTable()
        .select('*')
        .neq('status', 'finished')
        .order('match_date', { ascending: true });

      if (stage !== 'all') {
        query = query.eq('stage', stage);
      }

      const { data: matches, error: matchesError } = await query;

      if (matchesError) throw matchesError;
      
      const typedMatches = matches as TestMatch[];
      
      if (!typedMatches || typedMatches.length === 0) {
        throw new Error('No test matches to simulate');
      }

      let simulatedCount = 0;

      // Simulate each test match - this triggers calculate_test_prediction_points
      for (const match of typedMatches) {
        const homeScore = generateWeightedScore();
        const awayScore = generateWeightedScore();

        const { error } = await getTestMatchesTable()
          .update({
            home_score: homeScore,
            away_score: awayScore,
            status: 'finished',
          })
          .eq('id', match.id);

        if (error) throw error;
        simulatedCount++;
      }

      return { simulatedCount };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['test-leagues'] });
      queryClient.invalidateQueries({ queryKey: ['test-matches'] });
      queryClient.invalidateQueries({ queryKey: ['test-matches-status'] });
      queryClient.invalidateQueries({ queryKey: ['test-league-results'] });
      toast.success(`Simulated ${data.simulatedCount} test matches!`);
    },
    onError: (error: Error) => {
      toast.error(`Simulation failed: ${error.message}`);
    },
  });
}

// Reset test match results (revert to scheduled) - only affects test_matches
export function useResetSimulation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (stage?: TournamentStage) => {
      let query = getTestMatchesTable()
        .update({
          home_score: null,
          away_score: null,
          status: 'scheduled',
        })
        .eq('status', 'finished');

      if (stage) {
        query = query.eq('stage', stage);
      }

      const { error, count } = await query;

      if (error) throw error;
      return { resetCount: count || 0 };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['test-leagues'] });
      queryClient.invalidateQueries({ queryKey: ['test-matches'] });
      queryClient.invalidateQueries({ queryKey: ['test-matches-status'] });
      queryClient.invalidateQueries({ queryKey: ['test-league-results'] });
      toast.success(`Reset ${data.resetCount} test matches to scheduled`);
    },
    onError: (error: Error) => {
      toast.error(`Reset failed: ${error.message}`);
    },
  });
}

// Get test league results
export function useTestLeagueResults(leagueId: string | null) {
  return useQuery({
    queryKey: ['test-league-results', leagueId],
    enabled: !!leagueId,
    queryFn: async () => {
      if (!leagueId) return [];

      // Get all predictions with points for this league
      const { data: predictions, error } = await supabase
        .from('predictions')
        .select('user_id, points_earned, predicted_home_score, predicted_away_score, match_id')
        .eq('league_id', leagueId);

      if (error) throw error;

      // Get finished test matches for comparison
      const { data: testMatches } = await getTestMatchesTable()
        .select('source_match_id, home_score, away_score, status')
        .eq('status', 'finished');

      const typedTestMatches = (testMatches || []) as Array<{
        source_match_id: string | null;
        home_score: number | null;
        away_score: number | null;
        status: string | null;
      }>;

      const matchMap = new Map(typedTestMatches.map(m => [m.source_match_id, m]));

      // Aggregate by user
      const userStats = new Map<string, {
        total_points: number;
        exact_score_count: number;
        correct_outcome_count: number;
      }>();

      for (const pred of predictions || []) {
        const stats = userStats.get(pred.user_id) || {
          total_points: 0,
          exact_score_count: 0,
          correct_outcome_count: 0,
        };

        stats.total_points += pred.points_earned || 0;

        // Check if this was an exact match or correct outcome
        const matchResult = matchMap.get(pred.match_id);
        if (matchResult && matchResult.home_score !== null && matchResult.away_score !== null) {
          const isExact = pred.predicted_home_score === matchResult.home_score &&
                          pred.predicted_away_score === matchResult.away_score;
          const predOutcome = Math.sign(pred.predicted_home_score - pred.predicted_away_score);
          const actualOutcome = Math.sign(matchResult.home_score - matchResult.away_score);
          const isCorrectOutcome = predOutcome === actualOutcome;

          if (isExact) {
            stats.exact_score_count++;
          } else if (isCorrectOutcome) {
            stats.correct_outcome_count++;
          }
        }

        userStats.set(pred.user_id, stats);
      }

      // Get test user profiles
      const { data: testUsers } = await supabase
        .from('test_user_profiles')
        .select('*');

      const userMap = new Map(testUsers?.map(u => [u.id, u.display_name]) || []);

      // Build results array
      const results: TestLeagueResult[] = Array.from(userStats.entries()).map(([userId, stats]) => ({
        user_id: userId,
        display_name: userMap.get(userId) || 'Unknown',
        ...stats,
      }));

      // Sort by total points descending
      results.sort((a, b) => b.total_points - a.total_points);

      return results;
    },
  });
}

// Delete test league and all associated data
export function useDeleteTestLeague() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leagueId: string) => {
      // Delete predictions for this league
      await supabase
        .from('predictions')
        .delete()
        .eq('league_id', leagueId);

      // Delete the league
      const { error } = await supabase
        .from('leagues')
        .delete()
        .eq('id', leagueId)
        .eq('is_test', true);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-leagues'] });
      toast.success('Test league deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });
}

// Reset entire test environment (delete test_matches, predictions, leagues, users)
export function useResetTestEnvironment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Get all test league IDs
      const { data: testLeagues } = await supabase
        .from('leagues')
        .select('id')
        .eq('is_test', true);

      const leagueIds = testLeagues?.map(l => l.id) || [];

      // Delete predictions for test leagues
      if (leagueIds.length > 0) {
        await supabase
          .from('predictions')
          .delete()
          .in('league_id', leagueIds);
      }

      // Delete all test_matches
      await getTestMatchesTable()
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      // Delete test leagues
      await supabase
        .from('leagues')
        .delete()
        .eq('is_test', true);

      // Delete all test user profiles
      await supabase
        .from('test_user_profiles')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      return { leaguesDeleted: leagueIds.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['test-leagues'] });
      queryClient.invalidateQueries({ queryKey: ['test-users'] });
      queryClient.invalidateQueries({ queryKey: ['test-matches'] });
      queryClient.invalidateQueries({ queryKey: ['test-matches-status'] });
      queryClient.invalidateQueries({ queryKey: ['test-league-results'] });
      toast.success(`Reset complete: deleted ${data.leaguesDeleted} test leagues and all test data`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to reset: ${error.message}`);
    },
  });
}

// Legacy alias for backwards compatibility
export const useDeleteAllTestData = useResetTestEnvironment;
