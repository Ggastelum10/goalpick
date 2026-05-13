/**
 * FIFA World Cup 2026 Group Standings Calculator
 * Implements official FIFA tiebreaker criteria from Competition Regulations Article 13
 */

export interface MatchResult {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
}

export interface HeadToHeadRecord {
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

export interface TeamStanding {
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  headToHead: Record<string, HeadToHeadRecord>;
}

/**
 * Calculate standings for a group based on match results
 * Follows FIFA World Cup 2026 tiebreaker rules
 */
export function calculateGroupStandings(matches: MatchResult[]): TeamStanding[] {
  const teams = new Map<string, TeamStanding>();

  // Initialize or get team standing
  const getTeam = (name: string): TeamStanding => {
    if (!teams.has(name)) {
      teams.set(name, {
        team: name,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
        headToHead: {},
      });
    }
    return teams.get(name)!;
  };

  // Process each match
  for (const match of matches) {
    const homeTeam = getTeam(match.homeTeam);
    const awayTeam = getTeam(match.awayTeam);

    // Update played count
    homeTeam.played++;
    awayTeam.played++;

    // Update goals
    homeTeam.goalsFor += match.homeScore;
    homeTeam.goalsAgainst += match.awayScore;
    awayTeam.goalsFor += match.awayScore;
    awayTeam.goalsAgainst += match.homeScore;

    // Update goal difference
    homeTeam.goalDifference = homeTeam.goalsFor - homeTeam.goalsAgainst;
    awayTeam.goalDifference = awayTeam.goalsFor - awayTeam.goalsAgainst;

    // Determine match result and update points
    let homePoints = 0;
    let awayPoints = 0;

    if (match.homeScore > match.awayScore) {
      homeTeam.won++;
      awayTeam.lost++;
      homePoints = 3;
      awayPoints = 0;
    } else if (match.homeScore < match.awayScore) {
      homeTeam.lost++;
      awayTeam.won++;
      homePoints = 0;
      awayPoints = 3;
    } else {
      homeTeam.drawn++;
      awayTeam.drawn++;
      homePoints = 1;
      awayPoints = 1;
    }

    homeTeam.points += homePoints;
    awayTeam.points += awayPoints;

    // Update head-to-head records
    if (!homeTeam.headToHead[match.awayTeam]) {
      homeTeam.headToHead[match.awayTeam] = {
        points: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
      };
    }
    if (!awayTeam.headToHead[match.homeTeam]) {
      awayTeam.headToHead[match.homeTeam] = {
        points: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
      };
    }

    homeTeam.headToHead[match.awayTeam].points += homePoints;
    homeTeam.headToHead[match.awayTeam].goalsFor += match.homeScore;
    homeTeam.headToHead[match.awayTeam].goalsAgainst += match.awayScore;
    homeTeam.headToHead[match.awayTeam].goalDifference =
      homeTeam.headToHead[match.awayTeam].goalsFor - homeTeam.headToHead[match.awayTeam].goalsAgainst;

    awayTeam.headToHead[match.homeTeam].points += awayPoints;
    awayTeam.headToHead[match.homeTeam].goalsFor += match.awayScore;
    awayTeam.headToHead[match.homeTeam].goalsAgainst += match.homeScore;
    awayTeam.headToHead[match.homeTeam].goalDifference =
      awayTeam.headToHead[match.homeTeam].goalsFor - awayTeam.headToHead[match.homeTeam].goalsAgainst;
  }

  // Convert to array and sort
  const standings = Array.from(teams.values());
  return sortStandings(standings);
}

/**
 * Sort standings using FIFA tiebreaker criteria
 * Article 13 of FIFA World Cup 2026 Competition Regulations
 */
function sortStandings(standings: TeamStanding[]): TeamStanding[] {
  return standings.sort((a, b) => {
    // 1. Points (descending)
    if (a.points !== b.points) {
      return b.points - a.points;
    }

    // Teams are tied on points - apply tiebreaker rules
    return applyTiebreakers(a, b, standings);
  });
}

/**
 * Apply FIFA tiebreaker criteria for teams with equal points
 * 
 * Step 1 - Head-to-Head (between tied teams only):
 *   a) Points in matches between tied teams
 *   b) Goal difference in matches between tied teams
 *   c) Goals scored in matches between tied teams
 * 
 * Step 2 - Overall Record (if still tied):
 *   d) Goal difference in all group matches
 *   e) Goals scored in all group matches
 *   f) Fair play score (not available from predictions - use alphabetical)
 */
function applyTiebreakers(a: TeamStanding, b: TeamStanding, allStandings: TeamStanding[]): number {
  // Get all teams tied on the same points as a and b
  const tiedTeams = allStandings.filter(t => t.points === a.points);
  
  if (tiedTeams.length === 2) {
    // Simple head-to-head between two teams
    return applyHeadToHeadTiebreaker(a, b);
  } else if (tiedTeams.length > 2) {
    // Multi-team tie - calculate head-to-head among all tied teams
    return applyMultiTeamHeadToHeadTiebreaker(a, b, tiedTeams);
  }
  
  // Should not reach here, but fallback to overall stats
  return applyOverallTiebreaker(a, b);
}

/**
 * Head-to-head tiebreaker between exactly two teams
 */
function applyHeadToHeadTiebreaker(a: TeamStanding, b: TeamStanding): number {
  const aVsB = a.headToHead[b.team];
  const bVsA = b.headToHead[a.team];

  // If no head-to-head record exists, skip to overall stats
  if (!aVsB || !bVsA) {
    return applyOverallTiebreaker(a, b);
  }

  // Step 1a: Points in head-to-head
  if (aVsB.points !== bVsA.points) {
    return bVsA.points - aVsB.points;
  }

  // Step 1b: Goal difference in head-to-head
  if (aVsB.goalDifference !== bVsA.goalDifference) {
    return bVsA.goalDifference - aVsB.goalDifference;
  }

  // Step 1c: Goals scored in head-to-head
  if (aVsB.goalsFor !== bVsA.goalsFor) {
    return bVsA.goalsFor - aVsB.goalsFor;
  }

  // Head-to-head didn't break the tie - apply overall stats
  return applyOverallTiebreaker(a, b);
}

/**
 * Head-to-head tiebreaker for more than two teams
 * Calculate mini-table among tied teams
 */
function applyMultiTeamHeadToHeadTiebreaker(
  a: TeamStanding,
  b: TeamStanding,
  tiedTeams: TeamStanding[]
): number {
  const tiedTeamNames = new Set(tiedTeams.map(t => t.team));

  // Calculate head-to-head stats among tied teams only
  const getH2HStats = (team: TeamStanding) => {
    let points = 0;
    let goalDiff = 0;
    let goalsFor = 0;

    for (const opponent of tiedTeamNames) {
      if (opponent !== team.team && team.headToHead[opponent]) {
        const record = team.headToHead[opponent];
        points += record.points;
        goalDiff += record.goalDifference;
        goalsFor += record.goalsFor;
      }
    }

    return { points, goalDiff, goalsFor };
  };

  const aStats = getH2HStats(a);
  const bStats = getH2HStats(b);

  // Step 1a: Points in head-to-head among tied teams
  if (aStats.points !== bStats.points) {
    return bStats.points - aStats.points;
  }

  // Step 1b: Goal difference in head-to-head among tied teams
  if (aStats.goalDiff !== bStats.goalDiff) {
    return bStats.goalDiff - aStats.goalDiff;
  }

  // Step 1c: Goals scored in head-to-head among tied teams
  if (aStats.goalsFor !== bStats.goalsFor) {
    return bStats.goalsFor - aStats.goalsFor;
  }

  // Head-to-head didn't break the tie - apply overall stats
  return applyOverallTiebreaker(a, b);
}

/**
 * Overall record tiebreaker (Step 2)
 */
function applyOverallTiebreaker(a: TeamStanding, b: TeamStanding): number {
  // Step 2d: Goal difference in all group matches
  if (a.goalDifference !== b.goalDifference) {
    return b.goalDifference - a.goalDifference;
  }

  // Step 2e: Goals scored in all group matches
  if (a.goalsFor !== b.goalsFor) {
    return b.goalsFor - a.goalsFor;
  }

  // Step 2f: Fair play score (not available from predictions)
  // Use alphabetical order as final fallback
  return a.team.localeCompare(b.team);
}

/**
 * Get the final position for each team (1-indexed)
 */
export function getTeamPositions(standings: TeamStanding[]): Record<string, number> {
  const positions: Record<string, number> = {};
  standings.forEach((team, index) => {
    positions[team.team] = index + 1;
  });
  return positions;
}

/**
 * Default group position bonus points
 */
export const DEFAULT_GROUP_POSITION_BONUSES: Record<number, number> = {
  1: 10,
  2: 7,
  3: 4,
  4: 2,
};

/**
 * Calculate group position bonus points based on predicted vs actual standings
 * @param predictedStandings - Standings derived from predicted match results
 * @param actualStandings - Actual final standings from the database
 * @param bonusPoints - Optional custom bonus points per position (defaults to 1st=10, 2nd=7, 3rd=4, 4th=2)
 */
export function calculateGroupBonus(
  predictedStandings: TeamStanding[],
  actualStandings: { team: string; final_position: number }[],
  bonusPoints?: Record<number, number>
): number {
  const pointsPerPosition = bonusPoints ?? DEFAULT_GROUP_POSITION_BONUSES;

  let bonus = 0;
  const predictedPositions = getTeamPositions(predictedStandings);

  for (const actual of actualStandings) {
    const predictedPosition = predictedPositions[actual.team];
    if (predictedPosition === actual.final_position) {
      bonus += pointsPerPosition[actual.final_position] || 0;
    }
  }

  return bonus;
}
