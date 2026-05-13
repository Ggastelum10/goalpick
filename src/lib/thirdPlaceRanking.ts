/**
 * Third-place team ranking & R32 slot assignment helpers.
 *
 * The 2026 tournament has 12 groups. The 8 best third-placed teams advance
 * to the Round of 32. FIFA fills 8 specific R32 slots (each restricted to
 * a subset of 5 eligible groups, e.g. "Best 3rd Place (A/B/C/D/F)") so that
 * no team can meet the runner-up of its own group too early.
 *
 * FIFA Article 19 — ranking criteria for third-placed teams across groups
 * (head-to-head does NOT apply because these teams come from different groups):
 *
 *  1. Greatest number of points obtained in all group matches
 *  2. Goal difference in all group matches
 *  3. Greatest number of goals scored in all group matches
 *  4. Fewest goals conceded in all group matches
 *  5. Fair-play points (yellow/red cards) — NOT TRACKED → skipped
 *  6. Drawing of lots by FIFA — we mark the cluster as "lot"
 *
 * IMPORTANT: When 2+ teams remain tied after criteria 1-4 (i.e. fall into
 * the "lot" bucket), FIFA performs an actual random draw. We cannot simulate
 * that, so we:
 *  - Use a deterministic alphabetical fallback for display ordering
 *  - Flag every team in the tie cluster with `resolvedByLot = true`
 *  - Detect clusters that straddle the rank-8 / rank-9 cut-line, since
 *    those are the most consequential (the draw could change WHO qualifies)
 */

import { Match } from '@/hooks/useMatches';
import { GroupStanding, SimulatedTeam } from './bracketSimulation';
import { parseTeamSource, extractMatchNumber, THIRD_PLACE_MATCH_IDS } from './fifaBracketPairings';
import { assignThirdPlaceTeams } from './knockoutBracketResolver';

export interface RankedThirdPlaceTeam {
  rank: number;
  team: string;
  flag: string | null;
  groupOrigin: string;
  played: number;
  points: number;
  goalDiff: number;
  goalsFor: number;
  goalsAgainst: number;
  qualifies: boolean;
  /**
   * True if this team belongs to a cluster of 2+ teams that are equal across
   * ALL measurable FIFA criteria (Pts, GD, GF, GA). Final order within such
   * a cluster is officially determined by drawing of lots.
   */
  resolvedByLot: boolean;
  /**
   * True if this team's lot-tie cluster crosses the rank-8 / rank-9 cut-line,
   * meaning the actual draw could change WHO qualifies (not just the order).
   */
  lotAffectsQualification: boolean;
}

export interface ThirdPlaceSlotAssignment {
  team: RankedThirdPlaceTeam;
  matchNumber: number;
  matchId: string;
  slotLabel: string;        // e.g. "3rd ABCDF"
  opponentLabel: string;    // e.g. "Winner Group E"
  eligibleGroups: string[]; // e.g. ['A','B','C','D','F']
}

export interface ComplianceIssue {
  severity: 'error' | 'warning';
  message: string;
}

export interface ComplianceResult {
  ok: boolean;
  issues: ComplianceIssue[];
}

/**
 * Canonical FIFA Article 19 comparator for third-placed teams.
 * Returns negative if `a` ranks higher (better), positive if `b` ranks higher.
 *
 * Used by both `rankThirdPlaceTeams` (this file) AND `getBestThirdPlaceTeams`
 * (bracketSimulation.ts) so the two helpers can never drift apart.
 */
export function compareThirdPlaceTeams(a: GroupStanding, b: GroupStanding): number {
  // 1. Points
  if (b.points !== a.points) return b.points - a.points;
  // 2. Goal difference
  if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
  // 3. Goals for
  if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
  // 4. Fewest goals against
  if (a.goalsAgainst !== b.goalsAgainst) return a.goalsAgainst - b.goalsAgainst;
  // 5. Fair-play points — NOT TRACKED
  // 6. Drawing of lots → deterministic alphabetical fallback
  return a.team.localeCompare(b.team);
}

/**
 * Returns true if two third-place teams are equal across every measurable
 * FIFA criterion (i.e. only "lot" can separate them).
 */
function isLotTieEquivalent(a: GroupStanding, b: GroupStanding): boolean {
  return (
    a.points === b.points &&
    a.goalDiff === b.goalDiff &&
    a.goalsFor === b.goalsFor &&
    a.goalsAgainst === b.goalsAgainst
  );
}

/**
 * Build a ranking of all third-placed teams using full FIFA Article 19 criteria.
 * Returns them sorted best-to-worst with `qualifies = true` for the top 8.
 *
 * Lot detection runs over the FULL sorted list (not just adjacent pairs),
 * so any cluster of 2+ teams equal across Pts/GD/GF/GA is flagged together —
 * including clusters that straddle the rank-8 cut-line.
 */
export function rankThirdPlaceTeams(
  standings: Record<string, GroupStanding[]>
): RankedThirdPlaceTeam[] {
  type Entry = { team: GroupStanding; group: string };
  const entries: Entry[] = [];

  Object.entries(standings).forEach(([groupName, teams]) => {
    if (teams[2]) entries.push({ team: teams[2], group: groupName });
  });

  // Sort using the canonical FIFA comparator
  entries.sort((a, b) => compareThirdPlaceTeams(a.team, b.team));

  // Detect lot clusters: walk the sorted list and group consecutive entries
  // that are equal across all measurable criteria. Any cluster of size >= 2
  // is a "lot tie".
  const lotMap = new Map<number, { resolvedByLot: boolean; lotAffectsQualification: boolean }>();
  const CUT_LINE = 8; // top-8 qualify

  let i = 0;
  while (i < entries.length) {
    let j = i + 1;
    while (j < entries.length && isLotTieEquivalent(entries[i].team, entries[j].team)) {
      j++;
    }
    if (j - i >= 2) {
      // Cluster spans indices [i, j-1]. The draw affects qualification iff
      // the cluster includes both qualifying and non-qualifying ranks.
      const affectsQualification = i < CUT_LINE && j > CUT_LINE;
      for (let k = i; k < j; k++) {
        lotMap.set(k, { resolvedByLot: true, lotAffectsQualification: affectsQualification });
      }
    }
    i = j;
  }

  return entries.map((e, idx) => {
    const lotInfo = lotMap.get(idx);
    return {
      rank: idx + 1,
      team: e.team.team,
      flag: e.team.flag,
      groupOrigin: e.group,
      played: e.team.played,
      points: e.team.points,
      goalDiff: e.team.goalDiff,
      goalsFor: e.team.goalsFor,
      goalsAgainst: e.team.goalsAgainst,
      qualifies: idx < CUT_LINE,
      resolvedByLot: lotInfo?.resolvedByLot ?? false,
      lotAffectsQualification: lotInfo?.lotAffectsQualification ?? false,
    };
  });
}

/**
 * Compute the R32 slot assignments for the top-8 third-placed teams,
 * mirroring `buildKnockoutBracket` but exposing slot metadata for display.
 */
export function getThirdPlaceSlotAssignments(
  standings: Record<string, GroupStanding[]>,
  matches: Match[]
): ThirdPlaceSlotAssignment[] {
  const ranked = rankThirdPlaceTeams(standings);
  const qualifiers = ranked.filter(r => r.qualifies);

  // Re-build the simulated team list in the same shape `assignThirdPlaceTeams` expects
  const simulatedTeams: SimulatedTeam[] = qualifiers.map(q => ({
    name: q.team,
    flag: q.flag,
    source: 'predicted',
    groupOrigin: q.groupOrigin,
  }));

  // Collect the 8 R32 slots with eligibility info
  const r32 = matches
    .filter(m => m.stage === 'round_of_32')
    .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime());

  const slots: {
    matchIndex: number;
    side: 'home' | 'away';
    eligibleGroups: string[];
    source: string;
  }[] = [];

  r32.forEach((match, idx) => {
    (['home', 'away'] as const).forEach(side => {
      const teamStr = side === 'home' ? match.home_team : match.away_team;
      const parsed = parseTeamSource(teamStr);
      if (parsed && 'thirdPlace' in parsed) {
        slots.push({
          matchIndex: idx,
          side,
          eligibleGroups: parsed.eligibleGroups || [],
          source: teamStr,
        });
      }
    });
  });

  const assignmentMap = assignThirdPlaceTeams(simulatedTeams, slots);

  const result: ThirdPlaceSlotAssignment[] = [];

  assignmentMap.forEach((value, matchIndex) => {
    const match = r32[matchIndex];
    const slot = slots.find(s => s.matchIndex === matchIndex && s.side === value.side);
    const opponentLabel = value.side === 'home' ? match.away_team : match.home_team;
    const teamRanked = qualifiers.find(q => q.team === value.team.name);
    if (!teamRanked) return;

    const slotLabel = slot
      ? `3rd ${slot.eligibleGroups.join('')}`
      : '3rd';

    result.push({
      team: teamRanked,
      matchNumber: extractMatchNumber(match.external_id),
      matchId: match.id,
      slotLabel,
      opponentLabel,
      eligibleGroups: slot?.eligibleGroups || [],
    });
  });

  // Sort by team rank ascending so the table reads top-to-bottom
  result.sort((a, b) => a.team.rank - b.team.rank);
  return result;
}

/**
 * Validate that the current third-place assignment respects FIFA constraints.
 */
export function validateThirdPlaceCompliance(
  ranked: RankedThirdPlaceTeam[],
  assignments: ThirdPlaceSlotAssignment[],
  matches: Match[]
): ComplianceResult {
  const issues: ComplianceIssue[] = [];

  const r32 = matches.filter(m => m.stage === 'round_of_32');
  const expectedSlotCount = r32.reduce((acc, m) => {
    let n = 0;
    const homeParsed = parseTeamSource(m.home_team);
    const awayParsed = parseTeamSource(m.away_team);
    if (homeParsed && 'thirdPlace' in homeParsed) n++;
    if (awayParsed && 'thirdPlace' in awayParsed) n++;
    return acc + n;
  }, 0);

  // 1. Number of qualifiers
  const qualifiers = ranked.filter(r => r.qualifies);
  if (qualifiers.length !== 8 && ranked.length >= 8) {
    issues.push({
      severity: 'error',
      message: `Expected exactly 8 third-place qualifiers, found ${qualifiers.length}.`,
    });
  }

  // 2. Incomplete groups (FIFA criteria assume all 3 group matches played)
  const incomplete = ranked.filter(r => r.played < 3);
  if (incomplete.length > 0) {
    issues.push({
      severity: 'warning',
      message: `Some third-placed teams have not played all 3 group matches yet (${incomplete.map(r => `${r.team} – ${r.played}/3`).join(', ')}). Ranking may change once all group fixtures are predicted.`,
    });
  }

  // 3. All R32 third-place slots filled
  if (expectedSlotCount > 0 && assignments.length !== expectedSlotCount) {
    issues.push({
      severity: 'error',
      message: `Only ${assignments.length}/${expectedSlotCount} R32 third-place slots could be assigned. The eligibility constraints could not be satisfied.`,
    });
  }

  // 4. Each assigned team's group is in its slot's eligibleGroups
  for (const a of assignments) {
    if (a.eligibleGroups.length > 0 && !a.eligibleGroups.includes(a.team.groupOrigin)) {
      issues.push({
        severity: 'error',
        message: `${a.team.team} (Group ${a.team.groupOrigin}) is assigned to slot ${a.slotLabel}, but its group is not in the eligible list.`,
      });
    }
  }

  // 5. No same-group meeting in R32
  for (const a of assignments) {
    const m = a.opponentLabel.match(/Winner Group ([A-L])/i);
    const opponentGroup = m ? m[1].toUpperCase() : null;
    if (opponentGroup && opponentGroup === a.team.groupOrigin) {
      issues.push({
        severity: 'error',
        message: `${a.team.team} (Group ${a.team.groupOrigin}) would face the winner of its own group in R32. FIFA forbids same-group rematches before the final.`,
      });
    }
  }

  // 6. Lot-tie escalation: if a lot cluster crosses the rank-8 cut-line,
  // the actual draw could change WHO qualifies → escalate to ERROR.
  const lotQualificationConflict = ranked.filter(r => r.lotAffectsQualification);
  if (lotQualificationConflict.length > 0) {
    const teams = lotQualificationConflict
      .map(r => `${r.team} (G${r.groupOrigin})`)
      .join(', ');
    issues.push({
      severity: 'error',
      message: `Drawing of lots would be required to determine WHICH teams qualify: ${teams}. These teams are equal on points, goal difference, goals for and goals against — the actual FIFA draw could produce a different set of 8 qualifiers than shown.`,
    });
  }

  const lotOrderingOnly = ranked.filter(r => r.resolvedByLot && !r.lotAffectsQualification);
  if (lotOrderingOnly.length > 0) {
    const teams = lotOrderingOnly.map(r => r.team).join(', ');
    issues.push({
      severity: 'warning',
      message: `Tie resolved by drawing of lots (alphabetical fallback used for display): ${teams}. Final ranking among these teams would be drawn by FIFA, but it does not affect who qualifies.`,
    });
  }

  return {
    ok: issues.every(i => i.severity !== 'error'),
    issues,
  };
}

/** Total number of third-place R32 slots — 8 in the 2026 format. */
export const THIRD_PLACE_SLOT_COUNT = THIRD_PLACE_MATCH_IDS.length;
