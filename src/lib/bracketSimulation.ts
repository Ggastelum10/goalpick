import { Match } from '@/hooks/useMatches';
import { Prediction } from '@/hooks/usePredictions';
import { compareThirdPlaceTeams } from './thirdPlaceRanking';

export interface SimulatedTeam {
  name: string;
  flag: string | null;
  source: 'real' | 'predicted';
  groupOrigin?: string; // Track which group this team came from (for 3rd-place assignment)
}

export interface SimulatedMatch {
  matchId: string;
  stage: Match['stage'];
  homeTeam: SimulatedTeam | null;
  awayTeam: SimulatedTeam | null;
  predictedHomeScore: number | null;
  predictedAwayScore: number | null;
  realHomeScore: number | null;
  realAwayScore: number | null;
  matchDate: string;
  groupName: string | null;
  venue: string | null;
  city: string | null;
  isSimulated: boolean;
}

export interface HeadToHeadRecord {
  points: number;
  goalDiff: number;
  goalsFor: number;
}

export interface GroupStanding {
  team: string;
  flag: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  headToHead: Record<string, HeadToHeadRecord>;
}

/**
 * Determine winner of a match based on scores (with optional penalty shootout)
 * IMPORTANT: For knockout matches, returns null if tied without valid penalties
 * This enforces that users must enter penalties for draws
 */
export function getMatchWinner(
  homeScore: number | null,
  awayScore: number | null,
  homeTeam: string,
  awayTeam: string,
  homeFlag: string | null = null,
  awayFlag: string | null = null,
  homePenalty: number | null = null,
  awayPenalty: number | null = null,
  requirePenaltyForDraw: boolean = true
): SimulatedTeam | null {
  if (homeScore === null || awayScore === null) return null;
  
  if (homeScore > awayScore) {
    return { name: homeTeam, flag: homeFlag, source: 'predicted' };
  } else if (awayScore > homeScore) {
    return { name: awayTeam, flag: awayFlag, source: 'predicted' };
  }
  
  // Scores are tied - check penalties
  if (homePenalty !== null && awayPenalty !== null) {
    if (homePenalty > awayPenalty) {
      return { name: homeTeam, flag: homeFlag, source: 'predicted' };
    } else if (awayPenalty > homePenalty) {
      return { name: awayTeam, flag: awayFlag, source: 'predicted' };
    }
    // Penalties are also tied - no winner
  }
  
  // If we require penalty for draw and don't have a valid one, return null
  // This prevents automatic advancement without penalty entry
  if (requirePenaltyForDraw) {
    return null;
  }
  
  // Legacy fallback: alphabetical (only used when requirePenaltyForDraw is false)
  return homeTeam < awayTeam 
    ? { name: homeTeam, flag: homeFlag, source: 'predicted' }
    : { name: awayTeam, flag: awayFlag, source: 'predicted' };
}

// Apply FIFA tiebreakers between two teams
function applyFifaTiebreakers(
  a: GroupStanding,
  b: GroupStanding,
  allStandings: GroupStanding[]
): number {
  const tiedTeams = allStandings.filter(t => t.points === a.points);
  
  if (tiedTeams.length === 2) {
    return applyHeadToHeadTiebreaker(a, b);
  } else if (tiedTeams.length > 2) {
    return applyMultiTeamHeadToHead(a, b, tiedTeams);
  }
  
  return applyOverallTiebreaker(a, b);
}

function applyHeadToHeadTiebreaker(a: GroupStanding, b: GroupStanding): number {
  const aVsB = a.headToHead[b.team];
  const bVsA = b.headToHead[a.team];

  if (!aVsB || !bVsA) {
    return applyOverallTiebreaker(a, b);
  }

  if (aVsB.points !== bVsA.points) {
    return bVsA.points - aVsB.points;
  }

  if (aVsB.goalDiff !== bVsA.goalDiff) {
    return bVsA.goalDiff - aVsB.goalDiff;
  }

  if (aVsB.goalsFor !== bVsA.goalsFor) {
    return bVsA.goalsFor - aVsB.goalsFor;
  }

  return applyOverallTiebreaker(a, b);
}

function applyMultiTeamHeadToHead(
  a: GroupStanding,
  b: GroupStanding,
  tiedTeams: GroupStanding[]
): number {
  const tiedTeamNames = new Set(tiedTeams.map(t => t.team));

  const getH2HStats = (team: GroupStanding) => {
    let points = 0;
    let goalDiff = 0;
    let goalsFor = 0;

    for (const opponent of tiedTeamNames) {
      if (opponent !== team.team && team.headToHead[opponent]) {
        const record = team.headToHead[opponent];
        points += record.points;
        goalDiff += record.goalDiff;
        goalsFor += record.goalsFor;
      }
    }
    return { points, goalDiff, goalsFor };
  };

  const aStats = getH2HStats(a);
  const bStats = getH2HStats(b);

  if (aStats.points !== bStats.points) {
    return bStats.points - aStats.points;
  }

  if (aStats.goalDiff !== bStats.goalDiff) {
    return bStats.goalDiff - aStats.goalDiff;
  }

  if (aStats.goalsFor !== bStats.goalsFor) {
    return bStats.goalsFor - aStats.goalsFor;
  }

  return applyOverallTiebreaker(a, b);
}

function applyOverallTiebreaker(a: GroupStanding, b: GroupStanding): number {
  if (a.goalDiff !== b.goalDiff) {
    return b.goalDiff - a.goalDiff;
  }

  if (a.goalsFor !== b.goalsFor) {
    return b.goalsFor - a.goalsFor;
  }

  return a.team.localeCompare(b.team);
}

/**
 * Check if the head-to-head mini-table among a cluster of teams produces
 * a complete, unambiguous ranking (no two teams share the same h2h stats).
 * Returns true if h2h decisively separates ALL teams in the cluster.
 */
export function isH2HDecisive(cluster: GroupStanding[]): boolean {
  if (cluster.length <= 1) return true;
  
  // For 2-team ties, h2h is decisive if the direct match has a winner
  if (cluster.length === 2) {
    const a = cluster[0];
    const b = cluster[1];
    const aVsB = a.headToHead[b.team];
    const bVsA = b.headToHead[a.team];
    
    if (!aVsB || !bVsA) return false;
    if (aVsB.points !== bVsA.points) return true;
    if (aVsB.goalDiff !== bVsA.goalDiff) return true;
    if (aVsB.goalsFor !== bVsA.goalsFor) return true;
    return false;
  }
  
  // For 3+ teams, compute h2h mini-table stats for each team
  const clusterNames = new Set(cluster.map(t => t.team));
  
  const h2hStats = cluster.map(team => {
    let points = 0;
    let goalDiff = 0;
    let goalsFor = 0;
    for (const opponent of clusterNames) {
      if (opponent !== team.team && team.headToHead[opponent]) {
        const record = team.headToHead[opponent];
        points += record.points;
        goalDiff += record.goalDiff;
        goalsFor += record.goalsFor;
      }
    }
    return { team: team.team, points, goalDiff, goalsFor };
  });
  
  // Sort by h2h criteria: points, then goal diff, then goals for
  h2hStats.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    return b.goalsFor - a.goalsFor;
  });
  
  // Check that every adjacent pair is strictly separated (no ties remain)
  for (let i = 0; i < h2hStats.length - 1; i++) {
    const curr = h2hStats[i];
    const next = h2hStats[i + 1];
    if (curr.points === next.points && curr.goalDiff === next.goalDiff && curr.goalsFor === next.goalsFor) {
      return false; // At least two teams are still tied in h2h
    }
  }
  
  return true;
}

/**
 * Determine if two teams should be flagged as "tied" for user resolution.
 * 
 * For 2-team ties: uses full FIFA criteria (h2h + overall stats).
 * For 3+ team ties: flags as tied if the h2h mini-table doesn't produce
 * a complete unambiguous ranking (e.g., circular results).
 */
export function areTeamsTrulyTied(a: GroupStanding, b: GroupStanding, allStandings: GroupStanding[]): boolean {
  if (a.points !== b.points) return false;
  
  const cluster = allStandings.filter(t => t.points === a.points);
  
  if (cluster.length === 2) {
    // For 2 teams, apply full FIFA criteria — only flag if everything matches
    const aVsB = a.headToHead[b.team];
    const bVsA = b.headToHead[a.team];
    
    if (aVsB && bVsA) {
      if (aVsB.points !== bVsA.points) return false;
      if (aVsB.goalDiff !== bVsA.goalDiff) return false;
      if (aVsB.goalsFor !== bVsA.goalsFor) return false;
    }
    
    if (a.goalDiff !== b.goalDiff) return false;
    if (a.goalsFor !== b.goalsFor) return false;
    
    return true;
  }
  
  // For 3+ teams with same points: tied if h2h is NOT decisive for the full cluster
  if (cluster.length > 2) {
    return !isH2HDecisive(cluster);
  }
  
  return true;
}

export function calculateGroupStandings(
  matches: Match[],
  predictions: Prediction[]
): Record<string, GroupStanding[]> {
  const groups: Record<string, Record<string, GroupStanding>> = {};
  
  const groupMatches = matches.filter(m => m.stage === 'group');
  
  groupMatches.forEach(match => {
    if (!match.group_name) return;
    
    if (!groups[match.group_name]) {
      groups[match.group_name] = {};
    }
    
    const initTeam = (name: string, flag: string | null) => {
      if (!groups[match.group_name!][name]) {
        groups[match.group_name!][name] = {
          team: name,
          flag,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDiff: 0,
          points: 0,
          headToHead: {},
        };
      }
    };
    
    initTeam(match.home_team, match.home_team_flag);
    initTeam(match.away_team, match.away_team_flag);
  });
  
  groupMatches.forEach(match => {
    if (!match.group_name) return;
    
    let homeScore: number | null = null;
    let awayScore: number | null = null;
    
    if (match.status === 'finished' && match.home_score !== null && match.away_score !== null) {
      homeScore = match.home_score;
      awayScore = match.away_score;
    } else {
      const prediction = predictions.find(p => p.match_id === match.id);
      if (prediction) {
        homeScore = prediction.predicted_home_score;
        awayScore = prediction.predicted_away_score;
      }
    }
    
    if (homeScore === null || awayScore === null) return;
    
    const homeTeamData = groups[match.group_name][match.home_team];
    const awayTeamData = groups[match.group_name][match.away_team];
    
    if (!homeTeamData || !awayTeamData) return;
    
    homeTeamData.played++;
    awayTeamData.played++;
    homeTeamData.goalsFor += homeScore;
    homeTeamData.goalsAgainst += awayScore;
    awayTeamData.goalsFor += awayScore;
    awayTeamData.goalsAgainst += homeScore;
    
    let homePoints = 0;
    let awayPoints = 0;
    
    if (homeScore > awayScore) {
      homeTeamData.won++;
      homePoints = 3;
      awayTeamData.lost++;
    } else if (homeScore < awayScore) {
      awayTeamData.won++;
      awayPoints = 3;
      homeTeamData.lost++;
    } else {
      homeTeamData.drawn++;
      awayTeamData.drawn++;
      homePoints = 1;
      awayPoints = 1;
    }
    
    homeTeamData.points += homePoints;
    awayTeamData.points += awayPoints;
    
    homeTeamData.goalDiff = homeTeamData.goalsFor - homeTeamData.goalsAgainst;
    awayTeamData.goalDiff = awayTeamData.goalsFor - awayTeamData.goalsAgainst;
    
    if (!homeTeamData.headToHead[match.away_team]) {
      homeTeamData.headToHead[match.away_team] = { points: 0, goalDiff: 0, goalsFor: 0 };
    }
    if (!awayTeamData.headToHead[match.home_team]) {
      awayTeamData.headToHead[match.home_team] = { points: 0, goalDiff: 0, goalsFor: 0 };
    }
    
    homeTeamData.headToHead[match.away_team].points += homePoints;
    homeTeamData.headToHead[match.away_team].goalsFor += homeScore;
    homeTeamData.headToHead[match.away_team].goalDiff += (homeScore - awayScore);
    
    awayTeamData.headToHead[match.home_team].points += awayPoints;
    awayTeamData.headToHead[match.home_team].goalsFor += awayScore;
    awayTeamData.headToHead[match.home_team].goalDiff += (awayScore - homeScore);
  });
  
  const result: Record<string, GroupStanding[]> = {};
  
  Object.entries(groups).forEach(([groupName, teams]) => {
    const standings = Object.values(teams);
    result[groupName] = standings.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return applyFifaTiebreakers(a, b, standings);
    });
  });
  
  return result;
}

export function getQualifiedTeams(
  standings: Record<string, GroupStanding[]>
): { first: SimulatedTeam[]; second: SimulatedTeam[]; third: SimulatedTeam[] } {
  const first: SimulatedTeam[] = [];
  const second: SimulatedTeam[] = [];
  const third: SimulatedTeam[] = [];
  
  Object.entries(standings).forEach(([_, teams]) => {
    if (teams[0]) {
      first.push({ name: teams[0].team, flag: teams[0].flag, source: 'predicted' });
    }
    if (teams[1]) {
      second.push({ name: teams[1].team, flag: teams[1].flag, source: 'predicted' });
    }
    if (teams[2]) {
      third.push({ name: teams[2].team, flag: teams[2].flag, source: 'predicted' });
    }
  });
  
  return { first, second, third };
}

export function getBestThirdPlaceTeams(
  standings: Record<string, GroupStanding[]>,
  count: number = 8
): SimulatedTeam[] {
  const thirdPlaceTeams: GroupStanding[] = [];
  
  Object.values(standings).forEach(teams => {
    if (teams[2]) {
      thirdPlaceTeams.push(teams[2]);
    }
  });
  
  // Use the canonical FIFA Article 19 comparator (shared with thirdPlaceRanking.ts)
  // so this function and `rankThirdPlaceTeams` can never produce different orders.
  thirdPlaceTeams.sort((a, b) => compareThirdPlaceTeams(a, b));
  
  // Track which group each 3rd-place team came from
  const groupByTeam = new Map<string, string>();
  Object.entries(standings).forEach(([groupName, teams]) => {
    if (teams[2]) {
      groupByTeam.set(teams[2].team, groupName);
    }
  });

  return thirdPlaceTeams.slice(0, count).map(t => ({
    name: t.team,
    flag: t.flag,
    source: 'predicted' as const,
    groupOrigin: groupByTeam.get(t.team),
  }));
}

export function simulateBracket(
  matches: Match[],
  predictions: Prediction[]
): SimulatedMatch[] {
  const simulatedMatches: SimulatedMatch[] = [];
  const predictionsMap = new Map(predictions.map(p => [p.match_id, p]));
  
  const standings = calculateGroupStandings(matches, predictions);
  const { first, second } = getQualifiedTeams(standings);
  const bestThird = getBestThirdPlaceTeams(standings, 8);
  
  const knockoutWinners: Map<string, SimulatedTeam> = new Map();
  
  matches.forEach(match => {
    const prediction = predictionsMap.get(match.id);
    
    let homeTeam: SimulatedTeam = {
      name: match.home_team,
      flag: match.home_team_flag,
      source: 'real',
    };
    let awayTeam: SimulatedTeam = {
      name: match.away_team,
      flag: match.away_team_flag,
      source: 'real',
    };
    
    let isSimulated = false;
    
    if (match.stage !== 'group') {
      const isTBD = (team: string) => 
        team.toLowerCase().includes('tbd') || 
        team.includes('Winner') || 
        team.includes('Loser') ||
        team.includes('1st') ||
        team.includes('2nd') ||
        team.includes('3rd');
      
      if (isTBD(match.home_team) || isTBD(match.away_team)) {
        isSimulated = true;
      }
    }
    
    const simMatch: SimulatedMatch = {
      matchId: match.id,
      stage: match.stage,
      homeTeam,
      awayTeam,
      predictedHomeScore: prediction?.predicted_home_score ?? null,
      predictedAwayScore: prediction?.predicted_away_score ?? null,
      realHomeScore: match.home_score,
      realAwayScore: match.away_score,
      matchDate: match.match_date,
      groupName: match.group_name,
      venue: match.venue,
      city: match.city,
      isSimulated,
    };
    
    simulatedMatches.push(simMatch);
    
    if (prediction && match.stage !== 'group') {
      const winner = getMatchWinner(
        prediction.predicted_home_score,
        prediction.predicted_away_score,
        homeTeam.name,
        awayTeam.name,
        homeTeam.flag,
        awayTeam.flag,
        prediction.predicted_home_penalty ?? null,
        prediction.predicted_away_penalty ?? null,
        true // Require penalty for draws
      );
      if (winner) {
        knockoutWinners.set(match.id, winner);
      }
    }
  });
  
  return simulatedMatches;
}

export function getSimulationStats(simMatches: SimulatedMatch[], predictions: Prediction[]) {
  const totalMatches = simMatches.length;
  const predictedCount = predictions.length;
  const completionPercentage = totalMatches > 0 ? Math.round((predictedCount / totalMatches) * 100) : 0;
  
  const finishedMatches = simMatches.filter(m => m.realHomeScore !== null && m.realAwayScore !== null);
  let correctOutcomes = 0;
  let exactScores = 0;
  
  for (const match of finishedMatches) {
    if (match.predictedHomeScore === null || match.predictedAwayScore === null) continue;
    
    const actualHome = match.realHomeScore!;
    const actualAway = match.realAwayScore!;
    const predHome = match.predictedHomeScore;
    const predAway = match.predictedAwayScore;
    
    if (predHome === actualHome && predAway === actualAway) {
      exactScores++;
      correctOutcomes++;
    } else {
      const actualResult = Math.sign(actualHome - actualAway);
      const predResult = Math.sign(predHome - predAway);
      if (actualResult === predResult) correctOutcomes++;
    }
  }
  
  return {
    totalMatches,
    predictedCount,
    completionPercentage,
    correctOutcomes,
    exactScores,
    finishedMatches: finishedMatches.length,
  };
}
