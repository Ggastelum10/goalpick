/**
 * 2026 Tournament World Cup Bracket Pairings
 * 
 * The tournament has 12 groups (A-L), producing:
 * - 24 direct qualifiers (1st and 2nd from each group)
 * - 8 best third-place teams (4 slots for "Best 3rd Place")
 * 
 * This file now parses actual database team strings like:
 * - "Winner Group A", "Runner-up Group B", "Best 3rd Place"
 * - "Winner Match 73", "Loser Match 101"
 */

// Stage order for bracket progression
export const KNOCKOUT_STAGES = ['round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final'] as const;
export type KnockoutStage = typeof KNOCKOUT_STAGES[number];

// Types for parsed team sources
export type GroupPositionSource = { position: 1 | 2; group: string };
export type ThirdPlaceSource = { thirdPlace: number; eligibleGroups?: string[] };
export type MatchWinnerSource = { winner: number };
export type MatchLoserSource = { loser: number };
export type TeamSource = GroupPositionSource | ThirdPlaceSource | MatchWinnerSource | MatchLoserSource;

/**
 * Parse database team strings into structured sources
 * Handles formats:
 * - "Winner Group A" -> { position: 1, group: 'A' }
 * - "Runner-up Group B" -> { position: 2, group: 'B' }
 * - "Best 3rd Place" -> { thirdPlace: -1 } (dynamic assignment)
 * - "Winner Match 75" -> { winner: 75 }
 * - "Loser Match 101" -> { loser: 101 }
 */
export function parseTeamSource(teamStr: string): TeamSource | null {
  if (!teamStr) return null;
  
  // "Winner Group X"
  const winnerGroupMatch = teamStr.match(/^Winner Group ([A-L])$/i);
  if (winnerGroupMatch) {
    return { position: 1, group: winnerGroupMatch[1].toUpperCase() };
  }
  
  // "Runner-up Group X"
  const runnerUpMatch = teamStr.match(/^Runner-up Group ([A-L])$/i);
  if (runnerUpMatch) {
    return { position: 2, group: runnerUpMatch[1].toUpperCase() };
  }
  
  // "Best 3rd Place" or "Best 3rd Place (A/B/C/D/F)" - matches any third-place slot
  if (teamStr.toLowerCase().includes('3rd place') || teamStr.toLowerCase().includes('third place')) {
    // Extract eligible groups from parenthetical notation like "(A/B/C/D/F)"
    const eligibleMatch = teamStr.match(/\(([A-L/]+)\)/);
    const eligibleGroups = eligibleMatch 
      ? eligibleMatch[1].split('/').map(g => g.trim().toUpperCase())
      : undefined;
    // Return a special marker; the resolver will assign the correct third-place team
    return { thirdPlace: -1, eligibleGroups };
  }
  
  // "Winner Match X" or "Winner Match 75"
  const winnerMatchMatch = teamStr.match(/^Winner Match (\d+)$/i);
  if (winnerMatchMatch) {
    return { winner: parseInt(winnerMatchMatch[1]) };
  }
  
  // "Loser Match X" (for 3rd place match)
  const loserMatchMatch = teamStr.match(/^Loser Match (\d+)$/i);
  if (loserMatchMatch) {
    return { loser: parseInt(loserMatchMatch[1]) };
  }
  
  // Legacy format: "1A" = 1st place Group A
  const legacyMatch = teamStr.match(/^(\d)([A-L])$/);
  if (legacyMatch) {
    return { position: parseInt(legacyMatch[1]) as 1 | 2, group: legacyMatch[2] };
  }
  
  // Legacy format: "W49" = Winner of match 49
  if (teamStr.startsWith('W')) {
    const num = parseInt(teamStr.slice(1));
    if (!isNaN(num)) return { winner: num };
  }
  
  // Legacy format: "L49" = Loser of match 49
  if (teamStr.startsWith('L')) {
    const num = parseInt(teamStr.slice(1));
    if (!isNaN(num)) return { loser: num };
  }
  
  // Legacy format: "3rd_X" = Xth best third-place team
  if (teamStr.startsWith('3rd_')) {
    return { thirdPlace: parseInt(teamStr.slice(4)) };
  }
  
  return null;
}

/**
 * Extract match number from external_id
 * 
 * Official International Football Tournament 2026 Match Numbering (per Article 12):
 * - Round of 32: M73 - M88 (16 matches)
 * - Round of 16: M89 - M96 (8 matches)
 * - Quarter Finals: M97 - M100 (4 matches)
 * - Semi Finals: M101 - M102 (2 matches)
 * - Third Place: M103 (1 match)
 * - Final: M104 (1 match)
 */
export function extractMatchNumber(externalId: string | null): number {
  if (!externalId) return 0;
  
  // Map external IDs to official FIFA match numbers
  const matchNumberMap: Record<string, number> = {
    // Round of 32 (M73-M88) - verified from FIFA.com/Wikipedia
    '400021518': 73,  // Jun 28 - Los Angeles (2A vs 2B)
    '400021513': 74,  // Jun 29 - Boston (1E vs 3rd ABCDF)
    '400021522': 75,  // Jun 29 - Monterrey (1F vs 2C)
    '400021516': 76,  // Jun 29 - Houston (1C vs 2F)
    '400021523': 77,  // Jun 30 - New York/NJ (1I vs 3rd CDFGH)
    '400021514': 78,  // Jun 30 - Dallas (2E vs 2I)
    '400021520': 79,  // Jun 30 - Mexico City (1A vs 3rd CEFHI)
    '400021512': 80,  // Jul 1 - Atlanta (1L vs 3rd EHIJK)
    '400021524': 81,  // Jul 1 - San Francisco (1D vs 3rd BEFIJ)
    '400021525': 82,  // Jul 1 - Seattle (1G vs 3rd AEHIJ)
    '400021526': 83,  // Jul 2 - Toronto (2K vs 2L)
    '400021519': 84,  // Jul 2 - Los Angeles (1H vs 2J)
    '400021527': 85,  // Jul 2 - Vancouver (1B vs 3rd EFGIJ)
    '400021521': 86,  // Jul 3 - Miami (1J vs 2H)
    '400021517': 87,  // Jul 3 - Kansas City (1K vs 3rd DEIJL)
    '400021515': 88,  // Jul 3 - Dallas (2D vs 2G)

    // Round of 16 (M89-M96) - verified from FIFA.com/Wikipedia
    '400021533': 89,  // Jul 4 - Philadelphia (W74 vs W77)
    '400021530': 90,  // Jul 4 - Houston (W73 vs W75)
    '400021532': 91,  // Jul 5 - New York/NJ (W76 vs W78)
    '400021531': 92,  // Jul 5 - Mexico City (W79 vs W80)
    '400021529': 93,  // Jul 6 - Dallas (W83 vs W84)
    '400021534': 94,  // Jul 6 - Seattle (W81 vs W82)
    '400021528': 95,  // Jul 7 - Atlanta (W86 vs W88)
    '400021535': 96,  // Jul 7 - Vancouver (W85 vs W87)

    // Quarter Finals (M97-M100) - verified from FIFA.com/Wikipedia
    '400021536': 97,  // Jul 9 - Boston (W89 vs W90)
    '400021538': 98,  // Jul 10 - Los Angeles (W93 vs W94)
    '400021539': 99,  // Jul 11 - Miami (W91 vs W92)
    '400021537': 100, // Jul 11 - Kansas City (W95 vs W96)

    // Semi Finals (M101-M102)
    '400021541': 101, // Jul 14 - Dallas (W97 vs W98)
    '400021540': 102, // Jul 15 - Atlanta (W99 vs W100)

    // Third Place & Final (M103-M104)
    '400021542': 103, // Jul 18 - Miami
    '400021543': 104, // Jul 19 - New York/NJ (Final)
  };
  
  return matchNumberMap[externalId] || 0;
}

/**
 * Get the display label for a stage
 */
export function getStageLabel(stage: KnockoutStage): string {
  const labels: Record<KnockoutStage, string> = {
    round_of_32: 'Round of 32',
    round_of_16: 'Round of 16',
    quarter_final: 'Quarter Finals',
    semi_final: 'Semi Finals',
    third_place: '3rd Place Match',
    final: 'Final',
  };
  return labels[stage] || stage;
}

/**
 * Get expected match counts per stage
 */
export function getExpectedMatchCount(stage: KnockoutStage): number {
  const counts: Record<KnockoutStage, number> = {
    round_of_32: 16,
    round_of_16: 8,
    quarter_final: 4,
    semi_final: 2,
    third_place: 1,
    final: 1,
  };
  return counts[stage];
}

// Third place team slot tracking for Best 3rd Place matches
// These are the R32 external_ids where a group winner plays a best third-placed team (8 matches)
export const THIRD_PLACE_MATCH_IDS = ['400021513', '400021523', '400021520', '400021512', '400021524', '400021525', '400021527', '400021517'];
