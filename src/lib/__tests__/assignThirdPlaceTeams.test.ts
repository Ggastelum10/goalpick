import { describe, it, expect } from 'vitest';
import { assignThirdPlaceTeams } from '@/lib/knockoutBracketResolver';
import type { SimulatedTeam } from '@/lib/bracketSimulation';

// Helper to build a team
const team = (name: string, group: string): SimulatedTeam => ({
  name,
  flag: null,
  source: 'predicted',
  groupOrigin: group,
});

// Helper to build a slot
const slot = (matchIndex: number, eligibleGroups: string[], side: 'home' | 'away' = 'away') => ({
  matchIndex,
  side,
  eligibleGroups,
  source: `Best 3rd Place (${eligibleGroups.join('/')})`,
});

describe('assignThirdPlaceTeams', () => {
  // ─── Basic assignment ───
  it('assigns all 8 teams to 8 slots when constraints allow', () => {
    const teams = [
      team('Peru', 'A'), team('Australia', 'B'), team('Serbia', 'C'),
      team('Scotland', 'D'), team('Ecuador', 'E'), team('Uruguay', 'F'),
      team('Paraguay', 'G'), team('Denmark', 'H'),
    ];
    const slots = [
      slot(0, ['A', 'B', 'C', 'D', 'F']),   // M74: 1E vs 3rd
      slot(1, ['C', 'D', 'F', 'G', 'H']),   // M77: 1I vs 3rd
      slot(2, ['C', 'E', 'F', 'H', 'I']),   // M79: 1A vs 3rd
      slot(3, ['E', 'H', 'I', 'J', 'K']),   // M80: 1L vs 3rd
      slot(4, ['B', 'E', 'F', 'I', 'J']),   // M81: 1D vs 3rd
      slot(5, ['A', 'E', 'H', 'I', 'J']),   // M82: 1G vs 3rd
      slot(6, ['E', 'F', 'G', 'I', 'J']),   // M85: 1B vs 3rd
      slot(7, ['D', 'E', 'I', 'J', 'L']),   // M87: 1K vs 3rd
    ];

    const result = assignThirdPlaceTeams(teams, slots);

    // All 8 slots filled
    expect(result.size).toBe(8);

    // Each assigned team must be eligible for its slot
    for (const [matchIdx, assignment] of result) {
      const s = slots.find(sl => sl.matchIndex === matchIdx)!;
      expect(s.eligibleGroups).toContain(assignment.team.groupOrigin);
    }

    // No team assigned twice
    const assignedTeams = new Set([...result.values()].map(a => a.team.name));
    expect(assignedTeams.size).toBe(8);
  });

  // ─── Each team goes only to eligible slot ───
  it('never assigns a team to a slot where its group is not listed', () => {
    const teams = [
      team('Chile', 'L'), team('Ecuador', 'E'), team('Denmark', 'H'),
    ];
    const slots = [
      slot(0, ['E', 'H', 'L']),   // All eligible
      slot(1, ['E', 'H']),        // Chile(L) NOT eligible
      slot(2, ['D', 'E', 'I', 'J', 'L']),   // Chile(L) eligible here
    ];

    const result = assignThirdPlaceTeams(teams, slots);
    expect(result.size).toBe(3);

    // Chile must NOT be in slot 1 (no L), must be in slot 0 or 2
    const chileSlot = [...result.entries()].find(([_, a]) => a.team.name === 'Chile');
    expect(chileSlot).toBeDefined();
    expect([0, 2]).toContain(chileSlot![0]);
  });

  // ─── Backtracking needed ───
  it('uses backtracking when greedy assignment would fail', () => {
    // Slot 0 accepts only A, Slot 1 accepts only A or B
    // If greedy assigns TeamA to slot 1, slot 0 has no candidate
    // Backtracking should assign TeamA→slot0, TeamB→slot1
    const teams = [team('T_A', 'A'), team('T_B', 'B')];
    const slots = [
      slot(0, ['A']),        // Only A fits
      slot(1, ['A', 'B']),   // A or B
    ];

    const result = assignThirdPlaceTeams(teams, slots);
    expect(result.size).toBe(2);

    const slot0Team = result.get(0)!.team.name;
    const slot1Team = result.get(1)!.team.name;
    expect(slot0Team).toBe('T_A');
    expect(slot1Team).toBe('T_B');
  });

  // ─── Impossible assignment returns partial ───
  it('returns partial result when no valid complete assignment exists', () => {
    // Both slots only accept Group Z, but only one team is from Z
    const teams = [team('T1', 'Z'), team('T2', 'Y')];
    const slots = [
      slot(0, ['Z']),
      slot(1, ['Z']),
    ];

    const result = assignThirdPlaceTeams(teams, slots);
    // Can only fill one slot (T1→slot0), T2 doesn't fit slot1
    expect(result.size).toBeLessThanOrEqual(1);
  });

  // ─── Empty inputs ───
  it('returns empty map for empty teams', () => {
    const result = assignThirdPlaceTeams([], [slot(0, ['A'])]);
    expect(result.size).toBe(0);
  });

  it('returns empty map for empty slots', () => {
    const result = assignThirdPlaceTeams([team('X', 'A')], []);
    expect(result.size).toBe(0);
  });

  // ─── Same-group avoidance (the FIFA rule) ───
  it('ensures no 3rd-place team faces a group winner from their own group', () => {
    // Real FIFA slots exclude the group winner's own group from eligibility
    // e.g., M79: 1A vs 3rd(C/E/F/H/I) — Group A is NOT in the list
    const teams = [
      team('Peru', 'A'), team('Serbia', 'C'), team('Ecuador', 'E'),
      team('Uruguay', 'F'), team('Denmark', 'H'), team('Egypt', 'I'),
    ];

    // Simulate slots where each group winner's group is excluded
    const slots = [
      slot(0, ['C', 'E', 'F', 'H', 'I']),   // 1A: no A
      slot(1, ['A', 'E', 'F', 'H', 'I']),   // 1C: no C
      slot(2, ['A', 'C', 'F', 'H', 'I']),   // 1E: no E
      slot(3, ['A', 'C', 'E', 'H', 'I']),   // 1F: no F
      slot(4, ['A', 'C', 'E', 'F', 'I']),   // 1H: no H
      slot(5, ['A', 'C', 'E', 'F', 'H']),   // 1I: no I
    ];

    const result = assignThirdPlaceTeams(teams, slots);
    expect(result.size).toBe(6);

    // Verify no team is in a slot that excludes its group
    for (const [matchIdx, assignment] of result) {
      const s = slots.find(sl => sl.matchIndex === matchIdx)!;
      expect(s.eligibleGroups).toContain(assignment.team.groupOrigin);
      // The slot for group X's winner should NOT have team from group X
      // (This is inherently true if eligibleGroups doesn't contain that group)
    }
  });

  // ─── Legacy teams without groupOrigin ───
  it('allows assignment when team has no groupOrigin (legacy fallback)', () => {
    const teams: SimulatedTeam[] = [
      { name: 'Unknown', flag: null, source: 'predicted' }, // no groupOrigin
    ];
    const slots = [slot(0, ['A', 'B'])];

    const result = assignThirdPlaceTeams(teams, slots);
    expect(result.size).toBe(1);
    expect(result.get(0)!.team.name).toBe('Unknown');
  });

  // ─── Preserves side (home/away) ───
  it('preserves the side property in assignments', () => {
    const teams = [team('T1', 'A')];
    const homeSlot = { matchIndex: 0, side: 'home' as const, eligibleGroups: ['A'], source: 'test' };

    const result = assignThirdPlaceTeams(teams, [homeSlot]);
    expect(result.get(0)!.side).toBe('home');
  });

  // ─── Full FIFA 2026 eligible groups scenario ───
  it('handles all 8 official R32 3rd-place slots with varied qualifying groups', () => {
    // Simulate different combinations of 8 qualifying 3rd-place teams
    // e.g., groups A,C,D,E,F,G,H,I qualify (B,J,K,L eliminated)
    const teams = [
      team('3rd_A', 'A'), team('3rd_C', 'C'), team('3rd_D', 'D'),
      team('3rd_E', 'E'), team('3rd_F', 'F'), team('3rd_G', 'G'),
      team('3rd_H', 'H'), team('3rd_I', 'I'),
    ];

    // Official FIFA slots
    const slots = [
      slot(0, ['A', 'B', 'C', 'D', 'F']),
      slot(1, ['C', 'D', 'F', 'G', 'H']),
      slot(2, ['C', 'E', 'F', 'H', 'I']),
      slot(3, ['E', 'H', 'I', 'J', 'K']),
      slot(4, ['B', 'E', 'F', 'I', 'J']),
      slot(5, ['A', 'E', 'H', 'I', 'J']),
      slot(6, ['E', 'F', 'G', 'I', 'J']),
      slot(7, ['D', 'E', 'I', 'J', 'L']),
    ];

    const result = assignThirdPlaceTeams(teams, slots);
    expect(result.size).toBe(8);

    // Verify all eligibility constraints
    for (const [matchIdx, assignment] of result) {
      const s = slots.find(sl => sl.matchIndex === matchIdx)!;
      expect(s.eligibleGroups).toContain(assignment.team.groupOrigin);
    }

    // No duplicates
    const names = [...result.values()].map(a => a.team.name);
    expect(new Set(names).size).toBe(8);
  });
});
