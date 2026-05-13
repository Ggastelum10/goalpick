import { describe, it, expect } from 'vitest';
import { calculateGroupStandings, getBestThirdPlaceTeams } from '@/lib/bracketSimulation';
import { buildKnockoutBracket } from '@/lib/knockoutBracketResolver';
import { parseTeamSource } from '@/lib/fifaBracketPairings';
import type { Match } from '@/hooks/useMatches';
import type { Prediction } from '@/hooks/usePredictions';

// Generate all 72 group matches for 12 groups (A-L) with 4 teams each
function generateGroupMatches(): Match[] {
  const groups: Record<string, string[]> = {
    A: ['Morocco', 'Argentina', 'Peru', 'Bolivia'],
    B: ['France', 'Czechia', 'Australia', 'Indonesia'],
    C: ['Brazil', 'Colombia', 'Serbia', 'Cameroon'],
    D: ['Japan', 'Türkiye', 'Scotland', 'Costa Rica'],
    E: ['USA', 'Mexico', 'Ecuador', 'Venezuela'],
    F: ['Germany', 'Sweden', 'Uruguay', 'China PR'],
    G: ['Spain', 'Netherlands', 'Paraguay', 'New Zealand'],
    H: ['England', 'Senegal', 'Denmark', 'Panama'],
    I: ['Portugal', 'Iraq', 'Egypt', 'South Korea'],
    J: ['Italy', 'Canada', 'Tunisia', 'Nigeria'],
    K: ['Belgium', 'Congo DR', 'Iran', 'Qatar'],
    L: ['Croatia', 'Poland', 'Chile', 'Saudi Arabia'],
  };

  const matches: Match[] = [];
  let id = 1;
  
  for (const [group, teams] of Object.entries(groups)) {
    // Round robin: 6 matches per group
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        matches.push({
          id: `g${id}`,
          home_team: teams[i],
          away_team: teams[j],
          home_team_flag: null,
          away_team_flag: null,
          home_score: null,
          away_score: null,
          match_date: '2026-06-15T18:00:00Z',
          stage: 'group' as const,
          status: 'scheduled' as const,
          group_name: group,
          venue: null,
          city: null,
          created_at: '',
          updated_at: '',
          external_id: `G${id}`,
        });
        id++;
      }
    }
  }
  return matches;
}

// Generate R32 matches matching the database
function generateKnockoutMatches(): Match[] {
  const r32: Array<[string, string, string, string]> = [
    // [external_id, home_team, away_team, stage]
    ['400021518', 'Runner-up Group A', 'Runner-up Group B', 'round_of_32'],
    ['400021513', 'Winner Group E', 'Best 3rd Place (A/B/C/D/F)', 'round_of_32'],
    ['400021522', 'Winner Group F', 'Runner-up Group C', 'round_of_32'],
    ['400021516', 'Winner Group C', 'Runner-up Group F', 'round_of_32'],
    ['400021523', 'Winner Group I', 'Best 3rd Place (C/D/F/G/H)', 'round_of_32'],
    ['400021514', 'Runner-up Group E', 'Runner-up Group I', 'round_of_32'],
    ['400021520', 'Winner Group A', 'Best 3rd Place (C/E/F/H/I)', 'round_of_32'],
    ['400021512', 'Winner Group L', 'Best 3rd Place (E/H/I/J/K)', 'round_of_32'],
    ['400021524', 'Winner Group D', 'Best 3rd Place (B/E/F/I/J)', 'round_of_32'],
    ['400021525', 'Winner Group G', 'Best 3rd Place (A/E/H/I/J)', 'round_of_32'],
    ['400021526', 'Runner-up Group K', 'Runner-up Group L', 'round_of_32'],
    ['400021519', 'Winner Group H', 'Runner-up Group J', 'round_of_32'],
    ['400021527', 'Winner Group B', 'Best 3rd Place (E/F/G/I/J)', 'round_of_32'],
    ['400021521', 'Winner Group J', 'Runner-up Group H', 'round_of_32'],
    ['400021517', 'Winner Group K', 'Best 3rd Place (D/E/I/J/L)', 'round_of_32'],
    ['400021515', 'Runner-up Group D', 'Runner-up Group G', 'round_of_32'],
  ];
  
  const r16: Array<[string, string, string]> = [
    ['400021533', 'Winner Match 74', 'Winner Match 77'],
    ['400021530', 'Winner Match 73', 'Winner Match 75'],
    ['400021532', 'Winner Match 76', 'Winner Match 78'],
    ['400021531', 'Winner Match 79', 'Winner Match 80'],
    ['400021529', 'Winner Match 83', 'Winner Match 84'],
    ['400021534', 'Winner Match 81', 'Winner Match 82'],
    ['400021528', 'Winner Match 86', 'Winner Match 88'],
    ['400021535', 'Winner Match 85', 'Winner Match 87'],
  ];
  
  const qf: Array<[string, string, string]> = [
    ['400021536', 'Winner Match 89', 'Winner Match 90'],
    ['400021538', 'Winner Match 93', 'Winner Match 94'],
    ['400021539', 'Winner Match 91', 'Winner Match 92'],
    ['400021537', 'Winner Match 95', 'Winner Match 96'],
  ];
  
  const sf: Array<[string, string, string]> = [
    ['400021541', 'Winner Match 97', 'Winner Match 98'],
    ['400021540', 'Winner Match 99', 'Winner Match 100'],
  ];
  
  const tp: Array<[string, string, string]> = [
    ['400021542', 'Loser Match 101', 'Loser Match 102'],
  ];
  
  const fin: Array<[string, string, string]> = [
    ['400021543', 'Winner Match 101', 'Winner Match 102'],
  ];

  const matches: Match[] = [];
  let id = 100;
  const baseDate = new Date('2026-06-28T18:00:00Z');
  
  for (const [extId, home, away, stage] of r32) {
    matches.push({
      id: `ko${id++}`,
      home_team: home,
      away_team: away,
      home_team_flag: null,
      away_team_flag: null,
      home_score: null,
      away_score: null,
      match_date: new Date(baseDate.getTime() + id * 3600000).toISOString(),
      stage: stage as any,
      status: 'scheduled' as const,
      group_name: null,
      venue: null,
      city: null,
      created_at: '',
      updated_at: '',
      external_id: extId,
    });
  }
  
  const stages: Array<[Array<[string, string, string]>, string]> = [
    [r16, 'round_of_16'],
    [qf, 'quarter_final'],
    [sf, 'semi_final'],
    [tp, 'third_place'],
    [fin, 'final'],
  ];
  
  for (const [stageMatches, stage] of stages) {
    for (const [extId, home, away] of stageMatches) {
      matches.push({
        id: `ko${id++}`,
        home_team: home,
        away_team: away,
        home_team_flag: null,
        away_team_flag: null,
        home_score: null,
        away_score: null,
        match_date: new Date(baseDate.getTime() + id * 3600000).toISOString(),
        stage: stage as any,
        status: 'scheduled' as const,
        group_name: null,
        venue: null,
        city: null,
        created_at: '',
        updated_at: '',
        external_id: extId,
      });
    }
  }
  
  return matches;
}

// Generate predictions: team1 always wins 2-0 (1st in group), team2 wins 1-0, team3 draws/loses
function generateGroupPredictions(matches: Match[]): Prediction[] {
  const predictions: Prediction[] = [];
  const groupMatches = matches.filter(m => m.stage === 'group');
  
  // Define seeding: first team listed wins most
  const groups: Record<string, string[]> = {
    A: ['Morocco', 'Argentina', 'Peru', 'Bolivia'],
    B: ['France', 'Czechia', 'Australia', 'Indonesia'],
    C: ['Brazil', 'Colombia', 'Serbia', 'Cameroon'],
    D: ['Japan', 'Türkiye', 'Scotland', 'Costa Rica'],
    E: ['USA', 'Mexico', 'Ecuador', 'Venezuela'],
    F: ['Germany', 'Sweden', 'Uruguay', 'China PR'],
    G: ['Spain', 'Netherlands', 'Paraguay', 'New Zealand'],
    H: ['England', 'Senegal', 'Denmark', 'Panama'],
    I: ['Portugal', 'Iraq', 'Egypt', 'South Korea'],
    J: ['Italy', 'Canada', 'Tunisia', 'Nigeria'],
    K: ['Belgium', 'Congo DR', 'Iran', 'Qatar'],
    L: ['Croatia', 'Poland', 'Chile', 'Saudi Arabia'],
  };
  
  // Ranking within group: 1st(seed0) > 2nd(seed1) > 3rd(seed2) > 4th(seed3)
  const teamRank = new Map<string, number>();
  for (const teams of Object.values(groups)) {
    teams.forEach((t, i) => teamRank.set(t, i));
  }
  
  for (const match of groupMatches) {
    const homeRank = teamRank.get(match.home_team) ?? 3;
    const awayRank = teamRank.get(match.away_team) ?? 3;
    
    let homeScore: number, awayScore: number;
    if (homeRank < awayRank) {
      homeScore = 2; awayScore = 0;
    } else if (awayRank < homeRank) {
      homeScore = 0; awayScore = 2;
    } else {
      homeScore = 1; awayScore = 1;
    }
    
    predictions.push({
      id: `pred_${match.id}`,
      match_id: match.id,
      user_id: 'test-user',
      predicted_home_score: homeScore,
      predicted_away_score: awayScore,
      created_at: '',
      updated_at: '',
      points_earned: 0,
      predicted_home_penalty: null,
      predicted_away_penalty: null,
    });
  }
  
  return predictions;
}

// Generate knockout predictions: home team always wins
function generateKnockoutPredictions(matches: Match[], bracket: any): Prediction[] {
  const predictions: Prediction[] = [];
  const koMatches = matches.filter(m => m.stage !== 'group');
  
  for (const match of koMatches) {
    predictions.push({
      id: `pred_${match.id}`,
      match_id: match.id,
      user_id: 'test-user',
      predicted_home_score: 1,
      predicted_away_score: 0,
      created_at: '',
      updated_at: '',
      points_earned: 0,
      predicted_home_penalty: null,
      predicted_away_penalty: null,
    });
  }
  
  return predictions;
}

describe('Full bracket simulation', () => {
  it('assigns 3rd-place teams correctly respecting eligibility', () => {
    const groupMatches = generateGroupMatches();
    const knockoutMatches = generateKnockoutMatches();
    const allMatches = [...groupMatches, ...knockoutMatches];
    
    const groupPredictions = generateGroupPredictions(allMatches);
    const koPredictions = generateKnockoutPredictions(allMatches, null);
    const allPredictions = [...groupPredictions, ...koPredictions];
    
    // Calculate standings first
    const standings = calculateGroupStandings(allMatches, allPredictions);
    
    // Log standings
    console.log('\n=== GROUP STANDINGS ===');
    for (const [group, teams] of Object.entries(standings).sort()) {
      console.log(`Group ${group}: ${teams.map((t,i) => `${i+1}.${t.team}(${t.points}pts)`).join(', ')}`);
    }
    
    // Get best 3rd place teams
    const thirdPlace = getBestThirdPlaceTeams(standings, 8);
    console.log('\n=== BEST 3RD PLACE TEAMS ===');
    thirdPlace.forEach((t, i) => console.log(`  ${i+1}. ${t.name} (from Group ${t.groupOrigin})`));
    
    // Build confirmed standings (all groups auto-confirmed based on calculated order)
    const confirmedStandings: Record<string, string[]> = {};
    for (const [group, teams] of Object.entries(standings)) {
      confirmedStandings[group] = teams.map(t => t.team);
    }
    
    // Build bracket
    const bracket = buildKnockoutBracket(allMatches, allPredictions, confirmedStandings);
    
    console.log('\n=== ROUND OF 32 ===');
    for (const match of bracket.round_of_32) {
      const homeName = match.homeTeam?.name ?? match.homeSource;
      const awayName = match.awayTeam?.name ?? match.awaySource;
      const homeGroup = match.homeTeam?.groupOrigin ?? '?';
      const awayGroup = match.awayTeam?.groupOrigin ?? '?';
      console.log(`  M${match.matchNumber}: ${homeName}(${homeGroup}) vs ${awayName}(${awayGroup}) | Sources: ${match.homeSource} vs ${match.awaySource}`);
      
      // Verify same-group avoidance: teams from same group should NOT face each other in R32
      if (match.homeTeam?.groupOrigin && match.awayTeam?.groupOrigin) {
        if (match.homeTeam.groupOrigin === match.awayTeam.groupOrigin) {
          console.error(`  ❌ SAME GROUP CLASH: ${homeName} and ${awayName} are both from Group ${homeGroup}!`);
        }
      }
      
      // Verify 3rd-place eligibility
      const awayParsed = parseTeamSource(match.awaySource);
      if (awayParsed && 'thirdPlace' in awayParsed && awayParsed.eligibleGroups && match.awayTeam?.groupOrigin) {
        const isEligible = awayParsed.eligibleGroups.includes(match.awayTeam.groupOrigin);
        if (!isEligible) {
          console.error(`  ❌ INELIGIBLE 3RD PLACE: ${awayName} from Group ${match.awayTeam.groupOrigin} not in eligible groups [${awayParsed.eligibleGroups}]`);
        } else {
          console.log(`  ✅ 3rd place ${awayName} from Group ${match.awayTeam.groupOrigin} is eligible for slot [${awayParsed.eligibleGroups}]`);
        }
      }
      
      const homeParsed = parseTeamSource(match.homeSource);
      if (homeParsed && 'thirdPlace' in homeParsed && homeParsed.eligibleGroups && match.homeTeam?.groupOrigin) {
        const isEligible = homeParsed.eligibleGroups.includes(match.homeTeam.groupOrigin);
        if (!isEligible) {
          console.error(`  ❌ INELIGIBLE 3RD PLACE: ${match.homeTeam.name} from Group ${match.homeTeam.groupOrigin} not in eligible groups [${homeParsed.eligibleGroups}]`);
        }
      }
    }
    
    // Verify later rounds propagation
    console.log('\n=== ROUND OF 16 ===');
    for (const match of bracket.round_of_16) {
      const homeName = match.homeTeam?.name ?? 'TBD';
      const awayName = match.awayTeam?.name ?? 'TBD';
      console.log(`  M${match.matchNumber}: ${homeName}(${match.homeTeam?.groupOrigin}) vs ${awayName}(${match.awayTeam?.groupOrigin})`);
    }
    
    console.log('\n=== QUARTER FINALS ===');
    for (const match of bracket.quarter_final) {
      const homeName = match.homeTeam?.name ?? 'TBD';
      const awayName = match.awayTeam?.name ?? 'TBD';
      console.log(`  M${match.matchNumber}: ${homeName}(${match.homeTeam?.groupOrigin}) vs ${awayName}(${match.awayTeam?.groupOrigin})`);
    }
    
    console.log('\n=== SEMI FINALS ===');
    for (const match of bracket.semi_final) {
      const homeName = match.homeTeam?.name ?? 'TBD';
      const awayName = match.awayTeam?.name ?? 'TBD';
      console.log(`  M${match.matchNumber}: ${homeName}(${match.homeTeam?.groupOrigin}) vs ${awayName}(${match.awayTeam?.groupOrigin})`);
    }
    
    console.log('\n=== FINAL ===');
    const finalMatch = bracket.final[0];
    if (finalMatch) {
      console.log(`  M${finalMatch.matchNumber}: ${finalMatch.homeTeam?.name ?? 'TBD'} vs ${finalMatch.awayTeam?.name ?? 'TBD'}`);
    }
    
    if (bracket.champion) {
      console.log(`\n🏆 CHAMPION: ${bracket.champion.name}`);
    }
    
    // Assertions
    // 1. All 8 3rd-place slots should be filled
    const r32ThirdPlaceMatches = bracket.round_of_32.filter(m => {
      const ap = parseTeamSource(m.awaySource);
      const hp = parseTeamSource(m.homeSource);
      return (ap && 'thirdPlace' in ap) || (hp && 'thirdPlace' in hp);
    });
    expect(r32ThirdPlaceMatches.length).toBe(8);
    
    // 2. All 3rd-place teams should be resolved
    for (const match of r32ThirdPlaceMatches) {
      const ap = parseTeamSource(match.awaySource);
      if (ap && 'thirdPlace' in ap) {
        expect(match.awayTeam).not.toBeNull();
        // Verify eligibility
        if (ap.eligibleGroups && match.awayTeam?.groupOrigin) {
          expect(ap.eligibleGroups).toContain(match.awayTeam.groupOrigin);
        }
      }
    }
    
    // 3. No same-group clashes in R32
    for (const match of bracket.round_of_32) {
      if (match.homeTeam?.groupOrigin && match.awayTeam?.groupOrigin) {
        expect(match.homeTeam.groupOrigin).not.toBe(match.awayTeam.groupOrigin);
      }
    }
    
    // 4. All R16 teams should be resolved (since all R32 have predictions)
    for (const match of bracket.round_of_16) {
      expect(match.homeTeam).not.toBeNull();
      expect(match.awayTeam).not.toBeNull();
    }
    
    // 5. Champion should exist
    expect(bracket.champion).not.toBeNull();
  });

  it('preserves groupOrigin through all knockout rounds', () => {
    const groupMatches = generateGroupMatches();
    const knockoutMatches = generateKnockoutMatches();
    const allMatches = [...groupMatches, ...knockoutMatches];
    
    const groupPredictions = generateGroupPredictions(allMatches);
    const koPredictions = generateKnockoutPredictions(allMatches, null);
    const allPredictions = [...groupPredictions, ...koPredictions];
    
    const standings = calculateGroupStandings(allMatches, allPredictions);
    const confirmedStandings: Record<string, string[]> = {};
    for (const [group, teams] of Object.entries(standings)) {
      confirmedStandings[group] = teams.map(t => t.team);
    }
    
    const bracket = buildKnockoutBracket(allMatches, allPredictions, confirmedStandings);
    
    const stages: Array<{ name: string; matches: typeof bracket.round_of_32 }> = [
      { name: 'R32', matches: bracket.round_of_32 },
      { name: 'R16', matches: bracket.round_of_16 },
      { name: 'QF', matches: bracket.quarter_final },
      { name: 'SF', matches: bracket.semi_final },
      { name: '3rd', matches: bracket.third_place },
      { name: 'Final', matches: bracket.final },
    ];
    
    for (const stage of stages) {
      for (const match of stage.matches) {
        // Every resolved team must have groupOrigin
        if (match.homeTeam) {
          expect(match.homeTeam.groupOrigin, 
            `${stage.name} M${match.matchNumber} home ${match.homeTeam.name} missing groupOrigin`
          ).toBeTruthy();
        }
        if (match.awayTeam) {
          expect(match.awayTeam.groupOrigin,
            `${stage.name} M${match.matchNumber} away ${match.awayTeam.name} missing groupOrigin`
          ).toBeTruthy();
        }
        // Winners must also have groupOrigin
        if (match.winner) {
          expect(match.winner.groupOrigin,
            `${stage.name} M${match.matchNumber} winner ${match.winner.name} missing groupOrigin`
          ).toBeTruthy();
        }
        if (match.loser) {
          expect(match.loser.groupOrigin,
            `${stage.name} M${match.matchNumber} loser ${match.loser.name} missing groupOrigin`
          ).toBeTruthy();
        }
      }
    }
    
    // Champion must have groupOrigin
    expect(bracket.champion).not.toBeNull();
    expect(bracket.champion!.groupOrigin).toBeTruthy();
  });
});
