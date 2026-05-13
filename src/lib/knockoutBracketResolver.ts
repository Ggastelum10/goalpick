/**
 * Knockout Bracket Resolver (Database-Driven)
 * 
 * Resolves TBD team placeholders to actual team names based on:
 * 1. Group stage predictions → simulated standings
 * 2. Knockout predictions → winners advancing
 * 
 * Parses actual database strings like "Winner Group A", "Winner Match 75"
 */

import { Match } from '@/hooks/useMatches';
import { Prediction } from '@/hooks/usePredictions';
import { 
  calculateGroupStandings, 
  getBestThirdPlaceTeams, 
  getMatchWinner,
  GroupStanding,
  SimulatedTeam 
} from './bracketSimulation';
import { 
  parseTeamSource,
  extractMatchNumber,
  KnockoutStage,
  KNOCKOUT_STAGES,
  THIRD_PLACE_MATCH_IDS
} from './fifaBracketPairings';
import type { PredictionMode } from '@/hooks/useLeagues';

export interface ResolvedMatch {
  matchId: string;
  matchNumber: number;
  stage: KnockoutStage;
  homeTeam: SimulatedTeam | null;
  awayTeam: SimulatedTeam | null;
  homeSource: string;
  awaySource: string;
  prediction: Prediction | null;
  winner: SimulatedTeam | null;
  loser: SimulatedTeam | null;
  matchDate: string;
  venue: string | null;
  city: string | null;
  externalId: string | null;
  /**
   * How the home/away team slots in this matchup were filled:
   * - 'real'      → derived from real, finished tournament results
   * - 'predicted' → derived from the user's predictions
   * - 'tbd'       → not yet resolved
   */
  homeAdvancedFrom: 'real' | 'predicted' | 'tbd';
  awayAdvancedFrom: 'real' | 'predicted' | 'tbd';
}

export interface KnockoutBracketData {
  round_of_32: ResolvedMatch[];
  round_of_16: ResolvedMatch[];
  quarter_final: ResolvedMatch[];
  semi_final: ResolvedMatch[];
  third_place: ResolvedMatch[];
  final: ResolvedMatch[];
  standings: Record<string, GroupStanding[]>;
  thirdPlaceTeams: SimulatedTeam[];
  champion: SimulatedTeam | null;
}

/**
 * Validation result for a knockout match
 */
export interface MatchValidation {
  isValid: boolean;
  hasScores: boolean;
  needsPenalty: boolean;
  hasPenalty: boolean;
  errors: string[];
}

/**
 * Phase validation result
 */
export interface PhaseValidation {
  isComplete: boolean;
  isValid: boolean;
  predictedCount: number;
  totalCount: number;
  matchErrors: Record<string, string[]>;
}

/**
 * Validate a single knockout match prediction
 */
export function validateKnockoutMatch(
  match: ResolvedMatch,
  prediction: Prediction | null
): MatchValidation {
  const errors: string[] = [];
  
  if (!prediction) {
    return { 
      isValid: false, 
      hasScores: false, 
      needsPenalty: false, 
      hasPenalty: false,
      errors: ['No prediction made'] 
    };
  }
  
  const homeScore = prediction.predicted_home_score;
  const awayScore = prediction.predicted_away_score;
  const hasScores = homeScore !== null && awayScore !== null;
  
  // 0-0 is valid!
  if (!hasScores) {
    errors.push('Score not entered');
    return { isValid: false, hasScores: false, needsPenalty: false, hasPenalty: false, errors };
  }
  
  // Check if penalties are needed (tied scores in knockout)
  const isTied = homeScore === awayScore;
  const homePenalty = prediction.predicted_home_penalty ?? 0;
  const awayPenalty = prediction.predicted_away_penalty ?? 0;
  const hasPenalty = homePenalty > 0 || awayPenalty > 0;
  
  if (isTied) {
    if (!hasPenalty) {
      errors.push('Penalties required for draw');
      return { isValid: false, hasScores: true, needsPenalty: true, hasPenalty: false, errors };
    }
    if (homePenalty === awayPenalty) {
      errors.push('Penalties must have a winner');
      return { isValid: false, hasScores: true, needsPenalty: true, hasPenalty: true, errors };
    }
  }
  
  return { isValid: true, hasScores: true, needsPenalty: isTied, hasPenalty, errors: [] };
}

/**
 * Validate an entire knockout phase
 */
export function validateKnockoutPhase(
  bracket: KnockoutBracketData,
  stage: KnockoutStage
): PhaseValidation {
  const matches = bracket[stage];
  const matchErrors: Record<string, string[]> = {};
  let predictedCount = 0;
  let validCount = 0;
  
  for (const match of matches) {
    const validation = validateKnockoutMatch(match, match.prediction);
    
    if (validation.hasScores) {
      predictedCount++;
    }
    
    if (validation.isValid) {
      validCount++;
    } else if (validation.errors.length > 0) {
      matchErrors[match.matchId] = validation.errors;
    }
  }
  
  return {
    isComplete: predictedCount === matches.length,
    isValid: validCount === matches.length,
    predictedCount,
    totalCount: matches.length,
    matchErrors,
  };
}

/**
 * Represents a 3rd-place slot in the R32 bracket with its eligible groups
 */
interface ThirdPlaceSlot {
  matchIndex: number; // Index within the stage matches array
  side: 'home' | 'away'; // Which team position this slot fills
  eligibleGroups: string[]; // Groups whose 3rd-place teams can fill this slot
  source: string; // Original source string for debugging
}

/**
 * Assign 3rd-place teams to R32 slots using bipartite matching
 * Respects FIFA eligibility constraints (teams from the same group
 * cannot face each other until the final)
 */
export function assignThirdPlaceTeams(
  thirdPlaceTeams: SimulatedTeam[],
  slots: ThirdPlaceSlot[]
): Map<number, { team: SimulatedTeam; side: 'home' | 'away' }> {
  const result = new Map<number, { team: SimulatedTeam; side: 'home' | 'away' }>();
  
  if (slots.length === 0 || thirdPlaceTeams.length === 0) return result;
  
  // Build adjacency: which teams can go into which slots
  const teamCount = thirdPlaceTeams.length;
  const slotCount = slots.length;
  
  // Try to find a valid assignment using backtracking
  const assignment = new Array<number>(slotCount).fill(-1);
  const usedTeams = new Set<number>();
  
  function canAssign(slotIdx: number, teamIdx: number): boolean {
    if (usedTeams.has(teamIdx)) return false;
    const slot = slots[slotIdx];
    const team = thirdPlaceTeams[teamIdx];
    
    // If slot has eligibility constraints, check them
    if (slot.eligibleGroups.length > 0 && team.groupOrigin) {
      return slot.eligibleGroups.includes(team.groupOrigin);
    }
    
    // If no eligibility info (legacy), allow any assignment
    return true;
  }
  
  function backtrack(slotIdx: number): boolean {
    if (slotIdx >= slotCount) return true;
    
    for (let teamIdx = 0; teamIdx < teamCount; teamIdx++) {
      if (canAssign(slotIdx, teamIdx)) {
        assignment[slotIdx] = teamIdx;
        usedTeams.add(teamIdx);
        
        if (backtrack(slotIdx + 1)) return true;
        
        assignment[slotIdx] = -1;
        usedTeams.delete(teamIdx);
      }
    }
    return false;
  }
  
  backtrack(0);
  
  // Convert assignment to result map
  for (let i = 0; i < slotCount; i++) {
    if (assignment[i] >= 0) {
      const slot = slots[i];
      result.set(slot.matchIndex, {
        team: thirdPlaceTeams[assignment[i]],
        side: slot.side,
      });
    }
  }
  
  return result;
}

/**
 * Resolve a team from its source string using standings and knockout results
 */
function resolveTeamFromSource(
  source: string,
  standings: Record<string, GroupStanding[]>,
  knockoutWinners: Map<number, SimulatedTeam>,
  knockoutLosers: Map<number, SimulatedTeam>,
): SimulatedTeam | null {
  const parsed = parseTeamSource(source);
  if (!parsed) return null;

  // Group position (1st or 2nd)
  if ('position' in parsed && 'group' in parsed) {
    const groupStandings = standings[parsed.group];
    if (!groupStandings || groupStandings.length < parsed.position) return null;
    const team = groupStandings[parsed.position - 1];
    return { name: team.team, flag: team.flag, source: 'predicted', groupOrigin: parsed.group };
  }

  // Third place team — handled separately via assignThirdPlaceTeams
  if ('thirdPlace' in parsed) {
    return null; // Will be resolved via batch assignment
  }

  // Winner of a previous match
  if ('winner' in parsed) {
    return knockoutWinners.get(parsed.winner) || null;
  }

  // Loser of a previous match (for 3rd place game)
  if ('loser' in parsed) {
    return knockoutLosers.get(parsed.loser) || null;
  }

  return null;
}

/**
 * Build the complete knockout bracket from database matches and predictions
 */
export function buildKnockoutBracket(
  matches: Match[],
  predictions: Prediction[],
  confirmedStandings?: Record<string, string[]>,
  tiebreakOverrides?: Record<string, string[]>,
  predictionMode?: PredictionMode
): KnockoutBracketData {
  // Calculate group standings from group match predictions
  let standings = calculateGroupStandings(matches, predictions);

  // Per-group source: 'real' if every group match for that group is finished
  // (so standings reflect reality), otherwise 'predicted'. Computed up front
  // so it can drive BOTH the override gate just below AND the badge
  // classification used later in the resolver.
  const groupSource = new Map<string, 'real' | 'predicted'>();
  {
    const byGroup: Record<string, Match[]> = {};
    for (const m of matches) {
      if (m.stage === 'group' && m.group_name) {
        (byGroup[m.group_name] ||= []).push(m);
      }
    }
    for (const [groupName, gMatches] of Object.entries(byGroup)) {
      const allFinished = gMatches.length > 0 && gMatches.every((m) => m.status === 'finished');
      groupSource.set(groupName, allFinished ? 'real' : 'predicted');
    }
  }

  // Apply confirmed standings or tiebreak overrides to group standings.
  // CRITICAL: For groups where every match is finished, real results are
  // canonical and identical for every user — ignore per-user overrides so
  // R32 seeding is the same across the whole league. Only unfinished groups
  // still honor the user's tiebreak/confirmation choices.
  if (confirmedStandings || tiebreakOverrides) {
    const overrides = confirmedStandings || tiebreakOverrides || {};
    const newStandings: Record<string, GroupStanding[]> = {};

    for (const [groupName, groupStandings] of Object.entries(standings)) {
      const overrideOrder = overrides[groupName];
      const isFinished = groupSource.get(groupName) === 'real';
      if (!isFinished && overrideOrder && overrideOrder.length > 0) {
        // Reorder standings based on confirmed/override order
        newStandings[groupName] = [...groupStandings].sort((a, b) => {
          const aIdx = overrideOrder.indexOf(a.team);
          const bIdx = overrideOrder.indexOf(b.team);
          if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
          if (aIdx !== -1) return -1;
          if (bIdx !== -1) return 1;
          return 0;
        });
      } else {
        // Finished group OR no override → keep canonical (real-result) standings
        newStandings[groupName] = groupStandings;
      }
    }
    standings = newStandings;
  }
  
  const thirdPlaceTeams = getBestThirdPlaceTeams(standings, 8);
  
  // Map predictions by match_id for quick lookup
  const predictionMap = new Map(predictions.map(p => [p.match_id, p]));
  
  // Track knockout results by match number
  const knockoutWinners = new Map<number, SimulatedTeam>();
  const knockoutLosers = new Map<number, SimulatedTeam>();
  // Track HOW each match-number's winner was determined: from real
  // tournament results or from the user's predictions. Used to badge
  // downstream matches in the bracket UI.
  const winnerSource = new Map<number, 'real' | 'predicted'>();

  /**
   * Classify how a single team slot was filled, given its raw source string
   * (e.g. "Winner Group A", "Winner Match 75", "Best 3rd Place") and the
   * resolved team. Returns 'tbd' when the team is not yet known.
   */
  const classifySlotSource = (
    rawSource: string,
    resolvedTeam: SimulatedTeam | null,
  ): 'real' | 'predicted' | 'tbd' => {
    if (!resolvedTeam) return 'tbd';
    const parsed = parseTeamSource(rawSource);
    if (!parsed) return 'predicted';

    // Group position (Winner / Runner-up of Group X)
    if ('position' in parsed && 'group' in parsed) {
      return groupSource.get(parsed.group) ?? 'predicted';
    }
    // 3rd-place slot — derive from the resolved team's group of origin
    if ('thirdPlace' in parsed) {
      const origin = resolvedTeam.groupOrigin;
      return (origin ? groupSource.get(origin) : undefined) ?? 'predicted';
    }
    // Winner of a previous knockout match
    if ('winner' in parsed) {
      return winnerSource.get(parsed.winner) ?? 'predicted';
    }
    // Loser of a previous knockout match (3rd-place game)
    if ('loser' in parsed) {
      return winnerSource.get(parsed.loser) ?? 'predicted';
    }
    return 'predicted';
  };
  
  // Filter and sort knockout matches by stage and date
  const knockoutMatches = matches
    .filter(m => m.stage !== 'group')
    .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime());
  
  // Group matches by stage
  const matchesByStage: Record<KnockoutStage, Match[]> = {
    round_of_32: knockoutMatches.filter(m => m.stage === 'round_of_32'),
    round_of_16: knockoutMatches.filter(m => m.stage === 'round_of_16'),
    quarter_final: knockoutMatches.filter(m => m.stage === 'quarter_final'),
    semi_final: knockoutMatches.filter(m => m.stage === 'semi_final'),
    third_place: knockoutMatches.filter(m => m.stage === 'third_place'),
    final: knockoutMatches.filter(m => m.stage === 'final'),
  };
  
  // Pre-compute 3rd-place assignments for R32 using bipartite matching
  const r32Matches = matchesByStage['round_of_32'];
  const thirdPlaceSlots: ThirdPlaceSlot[] = [];
  
  r32Matches.forEach((match, idx) => {
    for (const side of ['home', 'away'] as const) {
      const teamStr = side === 'home' ? match.home_team : match.away_team;
      const parsed = parseTeamSource(teamStr);
      if (parsed && 'thirdPlace' in parsed) {
        thirdPlaceSlots.push({
          matchIndex: idx,
          side,
          eligibleGroups: parsed.eligibleGroups || [],
          source: teamStr,
        });
      }
    }
  });
  
  const thirdPlaceAssignments = assignThirdPlaceTeams(thirdPlaceTeams, thirdPlaceSlots);
  
  /**
   * Resolve all matches in a stage
   */
  const resolveStage = (stage: KnockoutStage): ResolvedMatch[] => {
    const stageMatches = matchesByStage[stage];
    
    return stageMatches.map((match, idx) => {
      const matchNumber = extractMatchNumber(match.external_id);
      
      // Resolve home and away teams
      let homeTeam = resolveTeamFromSource(
        match.home_team,
        standings,
        knockoutWinners,
        knockoutLosers,
      );
      
      let awayTeam = resolveTeamFromSource(
        match.away_team,
        standings,
        knockoutWinners,
        knockoutLosers,
      );
      
      // For R32, apply 3rd-place assignments from bipartite matching
      if (stage === 'round_of_32') {
        const assignment = thirdPlaceAssignments.get(idx);
        if (assignment) {
          if (assignment.side === 'home') {
            homeTeam = assignment.team;
          } else {
            awayTeam = assignment.team;
          }
        }
      }
      
      // Get prediction for this match
      const prediction = predictionMap.get(match.id) || null;
      
      // Determine winner and loser if prediction exists
      // Use strict penalty requirement for knockout matches
      let winner: SimulatedTeam | null = null;
      let loser: SimulatedTeam | null = null;
      
      // Phase-by-Phase mode: when the real match has finished, advance the
      // bracket using the REAL result so subsequent rounds reflect reality
      // (mirrors how group standings prefer real scores). In Full-Tournament
      // mode the chain stays prediction-driven.
      const useRealResult =
        predictionMode === 'update_every_stage' &&
        match.status === 'finished' &&
        match.home_score !== null &&
        match.away_score !== null &&
        homeTeam !== null &&
        awayTeam !== null;

      if (useRealResult && homeTeam && awayTeam) {
        winner = getMatchWinner(
          match.home_score,
          match.away_score,
          homeTeam.name,
          awayTeam.name,
          homeTeam.flag,
          awayTeam.flag,
          null,
          null,
          false // real finished match: if scoreline is decisive use it; tie falls back to alphabetical (real penalties not stored)
        );

        if (winner) {
          loser = winner.name === homeTeam.name ? awayTeam : homeTeam;
          if (!winner.groupOrigin && homeTeam.groupOrigin && winner.name === homeTeam.name) {
            winner = { ...winner, groupOrigin: homeTeam.groupOrigin };
          } else if (!winner.groupOrigin && awayTeam.groupOrigin && winner.name === awayTeam.name) {
            winner = { ...winner, groupOrigin: awayTeam.groupOrigin };
          }
          if (matchNumber > 0) {
            knockoutWinners.set(matchNumber, winner);
            knockoutLosers.set(matchNumber, loser);
            winnerSource.set(matchNumber, 'real');
          }
        }
      } else if (prediction && homeTeam && awayTeam) {
        winner = getMatchWinner(
          prediction.predicted_home_score,
          prediction.predicted_away_score,
          homeTeam.name,
          awayTeam.name,
          homeTeam.flag,
          awayTeam.flag,
          prediction.predicted_home_penalty ?? null,
          prediction.predicted_away_penalty ?? null,
          true // Require penalty for draws - blocks advancement without valid penalty
        );
        
        if (winner) {
          loser = winner.name === homeTeam.name ? awayTeam : homeTeam;
          // Preserve groupOrigin through advancement
          if (!winner.groupOrigin && homeTeam.groupOrigin && winner.name === homeTeam.name) {
            winner = { ...winner, groupOrigin: homeTeam.groupOrigin };
          } else if (!winner.groupOrigin && awayTeam.groupOrigin && winner.name === awayTeam.name) {
            winner = { ...winner, groupOrigin: awayTeam.groupOrigin };
          }
          // Store for later stages to reference
          if (matchNumber > 0) {
            knockoutWinners.set(matchNumber, winner);
            knockoutLosers.set(matchNumber, loser);
            winnerSource.set(matchNumber, 'predicted');
          }
        }
      }
      
      return {
        matchId: match.id,
        matchNumber,
        stage,
        homeTeam,
        awayTeam,
        homeSource: match.home_team,
        awaySource: match.away_team,
        prediction,
        winner,
        loser,
        matchDate: match.match_date,
        venue: match.venue,
        city: match.city,
        externalId: match.external_id,
        homeAdvancedFrom: classifySlotSource(match.home_team, homeTeam),
        awayAdvancedFrom: classifySlotSource(match.away_team, awayTeam),
      };
    });
  };
  
  // Resolve each stage in order (so winners propagate to later stages)
  const round_of_32 = resolveStage('round_of_32');
  const round_of_16 = resolveStage('round_of_16');
  const quarter_final = resolveStage('quarter_final');
  const semi_final = resolveStage('semi_final');
  const third_place = resolveStage('third_place');
  const final = resolveStage('final');
  
  // Determine champion from final match - requires complete prediction chain
  // Champion only exists if final has both teams resolved AND a valid winner
  const finalMatch = final[0];
  const champion = (finalMatch?.homeTeam && finalMatch?.awayTeam && finalMatch?.winner) 
    ? finalMatch.winner 
    : null;
  
  return {
    round_of_32,
    round_of_16,
    quarter_final,
    semi_final,
    third_place,
    final,
    standings,
    thirdPlaceTeams,
    champion,
  };
}

/**
 * Get completion stats for a stage
 */
export function getStageCompletion(bracket: KnockoutBracketData, stage: KnockoutStage): { 
  predicted: number; 
  total: number; 
  ready: boolean;
  valid: number;
} {
  const matches = bracket[stage];
  let predicted = 0;
  let valid = 0;
  
  for (const match of matches) {
    if (match.prediction !== null) {
      predicted++;
      const validation = validateKnockoutMatch(match, match.prediction);
      if (validation.isValid) {
        valid++;
      }
    }
  }
  
  const total = matches.length;
  
  // Stage is ready if all teams are resolved (not null)
  const ready = matches.every(m => m.homeTeam !== null && m.awayTeam !== null);
  
  return { predicted, total, ready, valid };
}

/**
 * Check if group stage is complete enough to show knockout bracket
 * All 12 groups need at least some standings calculated
 */
export function isGroupStageComplete(standings: Record<string, GroupStanding[]>): boolean {
  const groups = Object.keys(standings);
  if (groups.length !== 12) return false;
  
  // Check each group has at least 3 teams in standings (enough to calculate positions)
  return groups.every(group => standings[group]?.length >= 3);
}

/**
 * Get the next stage that needs predictions
 */
export function getNextIncompleteStage(bracket: KnockoutBracketData): KnockoutStage {
  for (const stage of KNOCKOUT_STAGES) {
    const stats = getStageCompletion(bracket, stage);
    if (stats.ready && stats.predicted < stats.total) {
      return stage;
    }
  }
  return 'round_of_32';
}
