import { describe, it, expect } from 'vitest';
import {
  calculateGroupStandings,
  areTeamsTrulyTied,
  isH2HDecisive,
  getMatchWinner,
} from '@/lib/bracketSimulation';
import type { Match } from '@/hooks/useMatches';
import type { Prediction } from '@/hooks/usePredictions';

// Helper to create a finished group match
function makeMatch(
  id: string,
  groupName: string,
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number
): Match {
  return {
    id,
    home_team: homeTeam,
    away_team: awayTeam,
    home_team_flag: null,
    away_team_flag: null,
    home_score: homeScore,
    away_score: awayScore,
    match_date: '2026-06-15T18:00:00Z',
    stage: 'group' as const,
    status: 'finished' as const,
    group_name: groupName,
    venue: null,
    city: null,
    created_at: '',
    updated_at: '',
    external_id: null,
  };
}

// Helper to get team order from standings
function getOrder(standings: Record<string, any[]>, group: string): string[] {
  return (standings[group] || []).map((t: any) => t.team);
}

describe('calculateGroupStandings', () => {
  // ───────────────────────────────────────────────────────────
  // Test 1: All teams on different points — pure ordering
  // ───────────────────────────────────────────────────────────
  it('Test 1 — ranks teams by points when no ties exist', () => {
    // A beats everyone (9pts), B beats C&D (6pts), C beats D (3pts), D loses all (0pts)
    const matches: Match[] = [
      makeMatch('1', 'A', 'TeamA', 'TeamB', 2, 0),
      makeMatch('2', 'A', 'TeamA', 'TeamC', 1, 0),
      makeMatch('3', 'A', 'TeamA', 'TeamD', 3, 0),
      makeMatch('4', 'A', 'TeamB', 'TeamC', 2, 1),
      makeMatch('5', 'A', 'TeamB', 'TeamD', 1, 0),
      makeMatch('6', 'A', 'TeamC', 'TeamD', 2, 0),
    ];

    const standings = calculateGroupStandings(matches, []);
    const order = getOrder(standings, 'A');

    expect(order).toEqual(['TeamA', 'TeamB', 'TeamC', 'TeamD']);
    expect(standings['A'][0].points).toBe(9);
    expect(standings['A'][1].points).toBe(6);
    expect(standings['A'][2].points).toBe(3);
    expect(standings['A'][3].points).toBe(0);
  });

  // ───────────────────────────────────────────────────────────
  // Test 2: Two-team tie resolved by head-to-head result
  // ───────────────────────────────────────────────────────────
  it('Test 2 — H2H winner ranks higher when two teams are tied on points', () => {
    // A and B both beat C and D (6pts each), but A beat B in H2H
    const matches: Match[] = [
      makeMatch('1', 'A', 'TeamA', 'TeamB', 1, 0),  // A beats B
      makeMatch('2', 'A', 'TeamA', 'TeamC', 2, 0),
      makeMatch('3', 'A', 'TeamA', 'TeamD', 1, 0),
      makeMatch('4', 'A', 'TeamB', 'TeamC', 3, 0),
      makeMatch('5', 'A', 'TeamB', 'TeamD', 2, 0),
      makeMatch('6', 'A', 'TeamC', 'TeamD', 0, 0),  // draw
    ];

    const standings = calculateGroupStandings(matches, []);
    const order = getOrder(standings, 'A');

    // A and B both have 9pts... wait, A beat B,C,D = 9pts. B lost to A, beat C,D = 6pts
    // Let me recalculate: A beats B(3), C(3), D(3) = 9pts. B loses to A(0), beats C(3), D(3) = 6pts
    // That's not a tie. Let me fix:
    // A beats B, loses to C. B beats C, loses to A. Both have same wins/losses vs D.
    const matches2: Match[] = [
      makeMatch('1', 'A', 'TeamA', 'TeamB', 1, 0),  // A beats B → A+3
      makeMatch('2', 'A', 'TeamA', 'TeamC', 0, 1),  // C beats A → C+3
      makeMatch('3', 'A', 'TeamA', 'TeamD', 2, 0),  // A beats D → A+3
      makeMatch('4', 'A', 'TeamB', 'TeamC', 2, 0),  // B beats C → B+3
      makeMatch('5', 'A', 'TeamB', 'TeamD', 1, 0),  // B beats D → B+3
      makeMatch('6', 'A', 'TeamC', 'TeamD', 1, 0),  // C beats D → C+3
    ];
    // A: 6pts (beat B, D; lost to C)
    // B: 6pts (beat C, D; lost to A)
    // C: 6pts (beat A, D; lost to B)  — wait that's a 3-way tie
    // Let me make it a clean 2-team tie:
    const matches3: Match[] = [
      makeMatch('1', 'A', 'TeamA', 'TeamB', 1, 0),  // A beats B → A+3
      makeMatch('2', 'A', 'TeamA', 'TeamC', 2, 0),  // A beats C → A+3
      makeMatch('3', 'A', 'TeamA', 'TeamD', 0, 1),  // D beats A → D+3, A has 6pts
      makeMatch('4', 'A', 'TeamB', 'TeamC', 1, 0),  // B beats C → B+3
      makeMatch('5', 'A', 'TeamB', 'TeamD', 0, 1),  // D beats B → D+3, B has 3pts... no
      makeMatch('6', 'A', 'TeamC', 'TeamD', 0, 0),  // draw
    ];
    // A: beat B(3)+C(3)+lost D(0) = 6pts
    // B: lost A(0)+beat C(3)+lost D(0) = 3pts — not tied with A
    // Need: A and B tied on points, A beat B in H2H
    const matchesFinal: Match[] = [
      makeMatch('1', 'G', 'TeamA', 'TeamB', 1, 0),  // A beats B
      makeMatch('2', 'G', 'TeamA', 'TeamC', 0, 2),  // A loses to C
      makeMatch('3', 'G', 'TeamA', 'TeamD', 3, 0),  // A beats D
      makeMatch('4', 'G', 'TeamB', 'TeamC', 0, 0),  // B draws C
      makeMatch('5', 'G', 'TeamB', 'TeamD', 2, 0),  // B beats D
      makeMatch('6', 'G', 'TeamC', 'TeamD', 1, 0),  // C beats D
    ];
    // A: W(B,D) L(C) = 6pts, GF=4, GA=2, GD=+2
    // B: W(D) D(C) L(A) = 4pts... not tied
    // Hmm. Let me just be precise:
    // For a 2-team tie: both need same points.
    // A beats B, A loses to C, A draws D → 3+0+1 = 4pts
    // B loses to A, B beats C, B draws D → 0+3+1 = 4pts
    // C loses to B? Wait: C beats A, C loses to B → need C vs D
    const m: Match[] = [
      makeMatch('1', 'G', 'TeamA', 'TeamB', 1, 0),  // A beats B (A+3, B+0)
      makeMatch('2', 'G', 'TeamA', 'TeamC', 0, 1),  // C beats A (A+0, C+3)
      makeMatch('3', 'G', 'TeamA', 'TeamD', 1, 1),  // Draw (A+1, D+1)
      makeMatch('4', 'G', 'TeamB', 'TeamC', 2, 0),  // B beats C (B+3, C+0)
      makeMatch('5', 'G', 'TeamB', 'TeamD', 1, 1),  // Draw (B+1, D+1)
      makeMatch('6', 'G', 'TeamC', 'TeamD', 3, 0),  // C beats D (C+3, D+0)
    ];
    // A: 3+0+1 = 4pts, GF=2, GA=2, GD=0
    // B: 0+3+1 = 4pts, GF=3, GA=2, GD=+1
    // C: 3+0+3 = 6pts
    // D: 1+1+0 = 2pts
    // A and B tied on 4pts. H2H: A beat B 1-0 → A should rank above B
    const standings2 = calculateGroupStandings(m, []);
    const order2 = getOrder(standings2, 'G');

    expect(order2[0]).toBe('TeamC'); // 6pts
    expect(order2[1]).toBe('TeamA'); // 4pts, H2H winner over B
    expect(order2[2]).toBe('TeamB'); // 4pts, H2H loser to A
    expect(order2[3]).toBe('TeamD'); // 2pts
  });

  // ───────────────────────────────────────────────────────────
  // Test 3: Two-team tie, H2H drawn, resolved by overall GD
  // ───────────────────────────────────────────────────────────
  it('Test 3 — falls to overall goal difference when H2H is drawn', () => {
    const m: Match[] = [
      makeMatch('1', 'G', 'TeamA', 'TeamB', 1, 1),  // Draw (A+1, B+1)
      makeMatch('2', 'G', 'TeamA', 'TeamC', 3, 0),  // A beats C big (A+3)
      makeMatch('3', 'G', 'TeamA', 'TeamD', 0, 2),  // D beats A (A+0)
      makeMatch('4', 'G', 'TeamB', 'TeamC', 1, 0),  // B beats C (B+3)
      makeMatch('5', 'G', 'TeamB', 'TeamD', 0, 2),  // D beats B (B+0)
      makeMatch('6', 'G', 'TeamC', 'TeamD', 0, 0),  // Draw
    ];
    // A: 1+3+0 = 4pts, GF=4, GA=3, GD=+1
    // B: 1+3+0 = 4pts, GF=2, GA=3, GD=-1
    // D: 0+3+3+1 wait... D: vs A win(3), vs B win(3), vs C draw(1) = 7pts
    // C: lost A(0), lost B(0), draw D(1) = 1pt
    // H2H A vs B: 1-1 draw → same points(1), GD=0 each, GF=1 each → all tied in H2H
    // Overall: A GD=+1, B GD=-1 → A ranks higher
    const standings = calculateGroupStandings(m, []);
    const order = getOrder(standings, 'G');

    expect(order[0]).toBe('TeamD'); // 7pts
    expect(order[1]).toBe('TeamA'); // 4pts, better overall GD (+1 vs -1)
    expect(order[2]).toBe('TeamB'); // 4pts
    expect(order[3]).toBe('TeamC'); // 1pt
  });

  // ───────────────────────────────────────────────────────────
  // Test 4: Three-team circular tie (A beats B, B beats C, C beats A)
  // All with same points — H2H mini-table needed
  // ───────────────────────────────────────────────────────────
  it('Test 4 — three-team circular tie uses H2H mini-table', () => {
    // A, B, C all beat each other circularly, D loses all
    const m: Match[] = [
      makeMatch('1', 'G', 'TeamA', 'TeamB', 1, 0),  // A beats B
      makeMatch('2', 'G', 'TeamA', 'TeamC', 0, 1),  // C beats A
      makeMatch('3', 'G', 'TeamA', 'TeamD', 2, 0),  // A beats D
      makeMatch('4', 'G', 'TeamB', 'TeamC', 1, 0),  // B beats C
      makeMatch('5', 'G', 'TeamB', 'TeamD', 2, 0),  // B beats D
      makeMatch('6', 'G', 'TeamC', 'TeamD', 2, 0),  // C beats D
    ];
    // A: W(B,D) L(C) = 6pts, GF=3, GA=1, GD=+2
    // B: W(C,D) L(A) = 6pts, GF=3, GA=1, GD=+2
    // C: W(A,D) L(B) = 6pts, GF=3, GA=1, GD=+2
    // D: 0pts
    // H2H mini-table among A,B,C:
    //   A: beat B(3pts, +1GD, 1GF), lost C(0pts, -1GD, 0GF) → 3pts, 0GD, 1GF
    //   B: beat C(3pts, +1GD, 1GF), lost A(0pts, -1GD, 0GF) → 3pts, 0GD, 1GF
    //   C: beat A(3pts, +1GD, 1GF), lost B(0pts, -1GD, 0GF) → 3pts, 0GD, 1GF
    // All identical in H2H! Falls to overall — also all identical.
    // This is a TRUE tie that should trigger TieResolutionModal.
    const standings = calculateGroupStandings(m, []);
    const group = standings['G'];

    // All three should have 6 points
    expect(group[0].points).toBe(6);
    expect(group[1].points).toBe(6);
    expect(group[2].points).toBe(6);
    expect(group[3].points).toBe(0);

    // areTeamsTrulyTied should return true for any pair among top 3
    expect(areTeamsTrulyTied(group[0], group[1], group)).toBe(true);
    expect(areTeamsTrulyTied(group[0], group[2], group)).toBe(true);

    // isH2HDecisive should return false
    const tiedCluster = group.filter(t => t.points === 6);
    expect(isH2HDecisive(tiedCluster)).toBe(false);
  });

  // ───────────────────────────────────────────────────────────
  // Test 5: Two-team tie, H2H drawn, same overall GD, resolved by goals scored
  // ───────────────────────────────────────────────────────────
  it('Test 5 — falls to goals scored when H2H and GD are identical', () => {
    const m: Match[] = [
      makeMatch('1', 'G', 'TeamA', 'TeamB', 2, 2),  // Draw
      makeMatch('2', 'G', 'TeamA', 'TeamC', 4, 1),  // A wins
      makeMatch('3', 'G', 'TeamA', 'TeamD', 0, 3),  // D wins
      makeMatch('4', 'G', 'TeamB', 'TeamC', 2, 0),  // B wins
      makeMatch('5', 'G', 'TeamB', 'TeamD', 0, 1),  // D wins
      makeMatch('6', 'G', 'TeamC', 'TeamD', 0, 0),  // Draw
    ];
    // A: 1+3+0 = 4pts, GF=6, GA=6, GD=0
    // B: 1+3+0 = 4pts, GF=4, GA=3, GD=+1
    // Hmm, GD not identical. Let me adjust:
    const m2: Match[] = [
      makeMatch('1', 'G', 'TeamA', 'TeamB', 1, 1),  // Draw (A+1, B+1)
      makeMatch('2', 'G', 'TeamA', 'TeamC', 3, 0),  // A wins (A+3)
      makeMatch('3', 'G', 'TeamA', 'TeamD', 0, 1),  // D wins (A+0)
      makeMatch('4', 'G', 'TeamB', 'TeamC', 1, 0),  // B wins (B+3)
      makeMatch('5', 'G', 'TeamB', 'TeamD', 0, 1),  // D wins (B+0)
      makeMatch('6', 'G', 'TeamC', 'TeamD', 0, 0),  // Draw
    ];
    // A: 4pts, GF=4, GA=2, GD=+2
    // B: 4pts, GF=2, GA=2, GD=0
    // Still different GD. For same GD + different GF:
    const m3: Match[] = [
      makeMatch('1', 'G', 'TeamA', 'TeamB', 0, 0),  // Draw
      makeMatch('2', 'G', 'TeamA', 'TeamC', 3, 1),  // A wins
      makeMatch('3', 'G', 'TeamA', 'TeamD', 0, 2),  // D wins
      makeMatch('4', 'G', 'TeamB', 'TeamC', 1, 0),  // B wins
      makeMatch('5', 'G', 'TeamB', 'TeamD', 1, 2),  // D wins
      makeMatch('6', 'G', 'TeamC', 'TeamD', 0, 0),  // Draw
    ];
    // A: 1+3+0 = 4pts, GF=3, GA=3, GD=0
    // B: 1+3+0 = 4pts, GF=2, GA=2, GD=0
    // H2H: 0-0 draw → same pts(1), GD=0, GF=0 each → fully tied in H2H
    // Overall: same GD(0), A has GF=3, B has GF=2 → A ranks higher by goals scored
    const standings = calculateGroupStandings(m3, []);
    const order = getOrder(standings, 'G');

    // D has: beat A(3)+beat B(3)+draw C(1) = 7pts
    // C: lost A(0)+lost B(0)+draw D(1) = 1pt
    expect(order[0]).toBe('TeamD'); // 7pts
    expect(order[1]).toBe('TeamA'); // 4pts, same GD as B but more goals scored
    expect(order[2]).toBe('TeamB'); // 4pts
    expect(order[3]).toBe('TeamC'); // 1pt
  });

  // ───────────────────────────────────────────────────────────
  // Test 6: Predictions-based standings (no real results)
  // ───────────────────────────────────────────────────────────
  it('Test 6 — calculates standings from predictions when matches are not finished', () => {
    const matches: Match[] = [
      { ...makeMatch('1', 'G', 'TeamA', 'TeamB', 0, 0), status: 'scheduled' as const, home_score: null, away_score: null },
      { ...makeMatch('2', 'G', 'TeamA', 'TeamC', 0, 0), status: 'scheduled' as const, home_score: null, away_score: null },
      { ...makeMatch('3', 'G', 'TeamB', 'TeamC', 0, 0), status: 'scheduled' as const, home_score: null, away_score: null },
    ];

    const predictions: Prediction[] = [
      { id: 'p1', match_id: '1', user_id: 'u1', predicted_home_score: 2, predicted_away_score: 0, created_at: '', updated_at: '', points_earned: 0, predicted_home_penalty: null, predicted_away_penalty: null },
      { id: 'p2', match_id: '2', user_id: 'u1', predicted_home_score: 1, predicted_away_score: 1, created_at: '', updated_at: '', points_earned: 0, predicted_home_penalty: null, predicted_away_penalty: null },
      { id: 'p3', match_id: '3', user_id: 'u1', predicted_home_score: 0, predicted_away_score: 3, created_at: '', updated_at: '', points_earned: 0, predicted_home_penalty: null, predicted_away_penalty: null },
    ];
    // Predicted: A beats B 2-0, A draws C 1-1, C beats B 3-0
    // A: W(3)+D(1) = 4pts, GF=3, GA=1, GD=+2
    // C: D(1)+W(3) = 4pts, GF=4, GA=1, GD=+3
    // B: L(0)+L(0) = 0pts
    // A and C tied on 4pts, H2H was a 1-1 draw → same H2H pts
    // H2H GD: A vs C = 1-1 → 0 each, GF = 1 each → tied in H2H
    // Overall: C has GD=+3, A has GD=+2 → C ranks higher
    const standings = calculateGroupStandings(matches, predictions);
    const order = getOrder(standings, 'G');

    expect(order[0]).toBe('TeamC'); // 4pts, better GD
    expect(order[1]).toBe('TeamA'); // 4pts
    expect(order[2]).toBe('TeamB'); // 0pts
  });

  // ───────────────────────────────────────────────────────────
  // Test 7: H2H decisive for 3-team tie (non-circular)
  // ───────────────────────────────────────────────────────────
  it('Test 7 — H2H mini-table resolves non-circular three-team tie', () => {
    // A beats B and C, B beats C, all beat D → 3-way on 6pts but H2H is decisive
    // Wait, if A beats B and C, A has more H2H points than B and C
    const m: Match[] = [
      makeMatch('1', 'G', 'TeamA', 'TeamB', 2, 1),  // A beats B
      makeMatch('2', 'G', 'TeamA', 'TeamC', 1, 0),  // A beats C
      makeMatch('3', 'G', 'TeamA', 'TeamD', 0, 1),  // D beats A
      makeMatch('4', 'G', 'TeamB', 'TeamC', 2, 0),  // B beats C
      makeMatch('5', 'G', 'TeamB', 'TeamD', 0, 1),  // D beats B
      makeMatch('6', 'G', 'TeamC', 'TeamD', 0, 1),  // D beats C
    ];
    // A: W(B,C) L(D) = 6pts
    // B: W(C) L(A) L(D)... wait that's only 3pts
    // B: L(A)=0, W(C)=3, L(D)=0 = 3pts. Not a 3-way tie.
    // Need all three to have 6pts: each beats one of the others + D
    // A beats B, A beats D. B beats C, B beats D. C beats A, C beats D.
    const m2: Match[] = [
      makeMatch('1', 'G', 'TeamA', 'TeamB', 2, 0),  // A beats B
      makeMatch('2', 'G', 'TeamA', 'TeamC', 0, 1),  // C beats A
      makeMatch('3', 'G', 'TeamA', 'TeamD', 3, 0),  // A beats D
      makeMatch('4', 'G', 'TeamB', 'TeamC', 2, 0),  // B beats C
      makeMatch('5', 'G', 'TeamB', 'TeamD', 1, 0),  // B beats D
      makeMatch('6', 'G', 'TeamC', 'TeamD', 2, 0),  // C beats D
    ];
    // A: 3+0+3 = 6pts, GF=5, GA=1, GD=+4
    // B: 0+3+3 = 6pts, GF=3, GA=2, GD=+1
    // C: 3+0+3 = 6pts, GF=3, GA=4, GD=-1
    // D: 0pts
    // H2H mini-table (among A,B,C):
    //   A: beat B(3, +2GD, 2GF), lost C(0, -1GD, 0GF) → 3pts, +1GD, 2GF
    //   B: lost A(0, -2GD, 0GF), beat C(3, +2GD, 2GF) → 3pts, 0GD, 2GF
    //   C: beat A(3, +1GD, 1GF), lost B(0, -2GD, 0GF) → 3pts, -1GD, 1GF
    // H2H pts all 3 → H2H GD: A(+1) > B(0) > C(-1) → decisive!
    // Order: A, B, C, D
    const standings = calculateGroupStandings(m2, []);
    const order = getOrder(standings, 'G');

    expect(order).toEqual(['TeamA', 'TeamB', 'TeamC', 'TeamD']);

    const tiedCluster = standings['G'].filter(t => t.points === 6);
    expect(isH2HDecisive(tiedCluster)).toBe(true);
    expect(areTeamsTrulyTied(tiedCluster[0], tiedCluster[1], standings['G'])).toBe(false);
  });
});

describe('getMatchWinner', () => {
  it('returns home team when home score is higher', () => {
    const winner = getMatchWinner(2, 1, 'Home', 'Away');
    expect(winner?.name).toBe('Home');
  });

  it('returns away team when away score is higher', () => {
    const winner = getMatchWinner(0, 1, 'Home', 'Away');
    expect(winner?.name).toBe('Away');
  });

  it('returns null on draw without penalties when requirePenaltyForDraw is true', () => {
    const winner = getMatchWinner(1, 1, 'Home', 'Away', null, null, null, null, true);
    expect(winner).toBeNull();
  });

  it('returns winner based on penalties when scores are tied', () => {
    const winner = getMatchWinner(1, 1, 'Home', 'Away', null, null, 5, 3, true);
    expect(winner?.name).toBe('Home');
  });

  it('returns null when penalties are also tied', () => {
    const winner = getMatchWinner(1, 1, 'Home', 'Away', null, null, 4, 4, true);
    expect(winner).toBeNull();
  });
});

describe('areTeamsTrulyTied', () => {
  it('returns false when teams have different points', () => {
    const a = { team: 'A', flag: null, played: 3, won: 3, drawn: 0, lost: 0, goalsFor: 5, goalsAgainst: 0, goalDiff: 5, points: 9, headToHead: {} };
    const b = { team: 'B', flag: null, played: 3, won: 2, drawn: 0, lost: 1, goalsFor: 3, goalsAgainst: 2, goalDiff: 1, points: 6, headToHead: {} };
    expect(areTeamsTrulyTied(a, b, [a, b])).toBe(false);
  });
});
