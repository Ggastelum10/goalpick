import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePoolSettings, usePaidUsersCount } from '@/hooks/usePoolSettings';
import { useUserLeagues, DEFAULT_STAGE_MULTIPLIERS, DEFAULT_GROUP_BONUSES, DEFAULT_EXACT_SCORE_POINTS, DEFAULT_OUTCOME_POINTS } from '@/hooks/useUserLeagues';
import { LeagueRulesSelector } from '@/components/rules/LeagueRulesSelector';
import { CustomBadge } from '@/components/rules/CustomBadge';
import { Target, CheckCircle2, XCircle, Trophy, Clock, Lock, Calculator, Users, Lightbulb } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Rules() {
  const { t } = useTranslation();
  const [selectedLeagueId, setSelectedLeagueId] = useState('default');

  const { data: poolSettings } = usePoolSettings();
  const { data: paidUsersCount } = usePaidUsersCount();
  const { data: leagues } = useUserLeagues();

  useEffect(() => {
    if (!leagues) return;
    if (leagues.length === 0) {
      if (selectedLeagueId !== 'default') setSelectedLeagueId('default');
      return;
    }
    const exists = leagues.some(l => l.id === selectedLeagueId);
    if (!exists) setSelectedLeagueId(leagues[0].id);
  }, [leagues, selectedLeagueId]);

  const selectedLeague = useMemo(
    () => leagues?.find(l => l.id === selectedLeagueId) ?? null,
    [leagues, selectedLeagueId]
  );

  const exactPts = selectedLeague?.exact_score_points ?? DEFAULT_EXACT_SCORE_POINTS;
  const outcomePts = selectedLeague?.outcome_points ?? DEFAULT_OUTCOME_POINTS;
  const mult = selectedLeague?.stage_multipliers ?? DEFAULT_STAGE_MULTIPLIERS;
  const bonuses = selectedLeague?.group_position_bonuses ?? DEFAULT_GROUP_BONUSES;

  const isScoringCustom = selectedLeague !== null && (exactPts !== DEFAULT_EXACT_SCORE_POINTS || outcomePts !== DEFAULT_OUTCOME_POINTS);
  const isMultipliersCustom = selectedLeague !== null && JSON.stringify(mult) !== JSON.stringify(DEFAULT_STAGE_MULTIPLIERS);
  const isBonusesCustom = selectedLeague !== null && JSON.stringify(bonuses) !== JSON.stringify(DEFAULT_GROUP_BONUSES);
  const isPrizesCustom = selectedLeague !== null;

  const ptsLabel = t('rules.scoring.pts');

  const scoringRules = [
    { key: 'exact', result: t('rules.scoring.exactScore'), description: t('rules.scoring.exactScoreDesc'), points: exactPts, icon: Target, color: 'text-chart-1' },
    { key: 'outcome', result: t('rules.scoring.correctOutcome'), description: t('rules.scoring.correctOutcomeDesc'), points: outcomePts, icon: CheckCircle2, color: 'text-chart-2' },
    { key: 'wrong', result: t('rules.scoring.wrongPrediction'), description: t('rules.scoring.wrongPredictionDesc'), points: 0, icon: XCircle, color: 'text-muted-foreground' },
  ];

  const stageMultipliers = [
    { key: 'group', stage: t('rules.stages.groupStage'), multiplier: `${mult.group}x`, baseExact: exactPts * mult.group, baseCurrent: outcomePts * mult.group },
    { key: 'r32', stage: t('rules.stages.roundOf32'), multiplier: `${mult.round_of_32}x`, baseExact: exactPts * mult.round_of_32, baseCurrent: outcomePts * mult.round_of_32 },
    { key: 'r16', stage: t('rules.stages.roundOf16'), multiplier: `${mult.round_of_16}x`, baseExact: exactPts * mult.round_of_16, baseCurrent: outcomePts * mult.round_of_16 },
    { key: 'qf', stage: t('rules.stages.quarterFinals'), multiplier: `${mult.quarter_final}x`, baseExact: exactPts * mult.quarter_final, baseCurrent: outcomePts * mult.quarter_final },
    { key: 'sf', stage: t('rules.stages.semiFinals'), multiplier: `${mult.semi_final}x`, baseExact: exactPts * mult.semi_final, baseCurrent: outcomePts * mult.semi_final },
    { key: '3rd', stage: t('rules.stages.thirdPlace'), multiplier: `${mult.third_place}x`, baseExact: exactPts * mult.third_place, baseCurrent: outcomePts * mult.third_place },
    { key: 'final', stage: t('rules.stages.final'), multiplier: `${mult.final}x`, baseExact: exactPts * mult.final, baseCurrent: outcomePts * mult.final },
  ];

  const groupPositionPoints = [
    { key: '1', position: t('rules.groupBonus.first'), emoji: '🥇', points: bonuses['1'], color: 'text-yellow-500' },
    { key: '2', position: t('rules.groupBonus.second'), emoji: '🥈', points: bonuses['2'], color: 'text-slate-400' },
    { key: '3', position: t('rules.groupBonus.third'), emoji: '🥉', points: bonuses['3'], color: 'text-amber-700' },
    { key: '4', position: t('rules.groupBonus.fourth'), emoji: '4️⃣', points: bonuses['4'], color: 'text-muted-foreground' },
  ];

  const maxGroupBonus = bonuses['1'] + bonuses['2'] + bonuses['3'] + bonuses['4'];

  const gameRules = [
    { key: 'submit', icon: Clock, title: t('rules.gameRules.submitTitle'), description: t('rules.gameRules.submitDesc') },
    { key: 'lock', icon: Lock, title: t('rules.gameRules.lockTitle'), description: t('rules.gameRules.lockDesc') },
    { key: 'auto', icon: Calculator, title: t('rules.gameRules.autoTitle'), description: t('rules.gameRules.autoDesc') },
  ];

  const entryFee = selectedLeague ? selectedLeague.entry_fee : (poolSettings?.entry_fee ?? 20);
  const currency = selectedLeague ? selectedLeague.currency : 'USD';
  const currencySymbol = currency === 'MXN' ? 'MX$' : '$';
  const totalPool = selectedLeague
    ? selectedLeague.prize_pool
    : (paidUsersCount ?? 0) * (poolSettings?.entry_fee ?? 20);
  const participantCount = selectedLeague ? selectedLeague.member_count : (paidUsersCount ?? 0);
  const firstPct = selectedLeague?.first_place_percentage ?? poolSettings?.first_place_percentage ?? 70;
  const secondPct = selectedLeague?.second_place_percentage ?? poolSettings?.second_place_percentage ?? 20;
  const thirdPct = selectedLeague?.third_place_percentage ?? poolSettings?.third_place_percentage ?? 10;
  const firstPrize = (firstPct / 100) * totalPool;
  const secondPrize = (secondPct / 100) * totalPool;
  const thirdPrize = (thirdPct / 100) * totalPool;

  const poolLabel = selectedLeague ? t('rules.prizes.prizePool') : t('rules.prizes.currentPool');

  return (
    <Layout>
      <div className="space-y-4 md:space-y-5 pb-20 md:pb-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display tracking-wide">{t('rules.pageTitle')}</h1>
          <p className="text-muted-foreground mt-1">{t('rules.pageSubtitle')}</p>
          <p className="text-sm text-muted-foreground mt-3 max-w-2xl">{t('rules.intro')}</p>
        </div>

        {/* League Selector */}
        <LeagueRulesSelector
          leagues={leagues}
          selectedLeagueId={selectedLeagueId}
          onSelect={setSelectedLeagueId}
        />

        {/* Scoring System */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              {t('rules.scoring.title')}
              <CustomBadge isCustom={isScoringCustom} />
            </CardTitle>
            <CardDescription>{t('rules.scoring.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {scoringRules.map((rule) => (
                <div
                  key={rule.key}
                  className="flex items-center gap-4 p-3 md:p-4 rounded-lg bg-muted/50"
                >
                  <div className={`p-2 rounded-full bg-background ${rule.color}`}>
                    <rule.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">{rule.result}</h4>
                    <p className="text-sm text-muted-foreground">{rule.description}</p>
                  </div>
                  <div className="text-2xl font-display font-bold text-primary">
                    {rule.points} {ptsLabel}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* How Points Work - Example */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-chart-4" />
              {t('rules.example.title')}
            </CardTitle>
            <CardDescription>{t('rules.example.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Match Scenario */}
            <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {t('rules.example.tournamentFinal')}
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🇧🇷</span>
                  <span className="font-semibold">Brazil</span>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-display font-bold">2 - 1</div>
                  <div className="text-xs text-muted-foreground">{t('rules.example.finalScore')}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Argentina</span>
                  <span className="text-xl">🇦🇷</span>
                </div>
              </div>
            </div>

            {/* Prediction Comparison */}
            <div className="grid gap-3 md:grid-cols-2">
              <div className="p-3 rounded-lg bg-chart-1/10 border border-chart-1/20">
                <div className="text-xs font-medium text-chart-1 mb-1">{t('rules.example.yourPrediction')}</div>
                <div className="font-semibold">Brazil 2 - 1 Argentina</div>
              </div>
              <div className="p-3 rounded-lg bg-chart-2/10 border border-chart-2/20">
                <div className="text-xs font-medium text-chart-2 mb-1">{t('rules.example.actualResult')}</div>
                <div className="font-semibold">Brazil 2 - 1 Argentina ✓</div>
              </div>
            </div>

            {/* Calculation Breakdown */}
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="text-sm font-semibold mb-3">{t('rules.example.pointCalculation')}</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('rules.example.basePoints')}</span>
                  <span className="font-mono font-semibold">{exactPts} {ptsLabel}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('rules.example.stageMultiplier')}</span>
                  <span className="font-mono font-semibold">× {mult.final}</span>
                </div>
                <div className="border-t border-primary/20 my-2" />
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{t('rules.example.totalEarned')}</span>
                  <span className="text-xl font-display font-bold text-primary">{exactPts * mult.final} {ptsLabel}</span>
                </div>
              </div>
            </div>

            {/* Alternative Outcomes */}
            <div className="grid gap-2 text-sm">
              <div className="flex items-center gap-3 p-2 rounded bg-muted/30">
                <CheckCircle2 className="h-4 w-4 text-chart-2 shrink-0" />
                <span className="text-muted-foreground">
                  {t('rules.example.altOutcome1Prefix')}<strong className="text-foreground">3-1</strong>{t('rules.example.altOutcome1Middle')}<strong className="text-foreground">2-1</strong>{t('rules.example.altOutcome1Suffix')}
                </span>
                <span className="ml-auto font-mono font-semibold">{outcomePts * mult.final} {ptsLabel}</span>
              </div>
              <div className="flex items-center gap-3 p-2 rounded bg-muted/30">
                <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">
                  {t('rules.example.altOutcome2Prefix')}<strong className="text-foreground">0-2</strong>{t('rules.example.altOutcome2Suffix')}
                </span>
                <span className="ml-auto font-mono font-semibold text-muted-foreground">0 {ptsLabel}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stage Multipliers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              {t('rules.stages.title')}
              <CustomBadge isCustom={isMultipliersCustom} />
            </CardTitle>
            <CardDescription>{t('rules.stages.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>{t('rules.stages.stage')}</TableHead>
                    <TableHead className="text-center">{t('rules.stages.multiplier')}</TableHead>
                    <TableHead className="text-center">{t('rules.stages.exactScore')}</TableHead>
                    <TableHead className="text-center">{t('rules.stages.correctOutcome')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stageMultipliers.map((stage, index) => {
                    const isLast = index === stageMultipliers.length - 1;
                    const multVal = parseFloat(stage.multiplier);
                    return (
                      <TableRow key={stage.key} className={isLast ? 'bg-primary/5 font-semibold' : ''}>
                        <TableCell className="font-medium">{stage.stage}</TableCell>
                        <TableCell className="text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            multVal >= 4
                              ? 'bg-primary/20 text-primary'
                              : multVal <= 1
                                ? 'bg-muted text-muted-foreground'
                                : 'bg-chart-2/20 text-chart-2'
                          }`}>
                            {stage.multiplier}
                          </span>
                        </TableCell>
                        <TableCell className="text-center font-mono">{stage.baseExact} {ptsLabel}</TableCell>
                        <TableCell className="text-center font-mono">{stage.baseCurrent} {ptsLabel}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Group Position Bonus */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-chart-3" />
              {t('rules.groupBonus.title')}
              <CustomBadge isCustom={isBonusesCustom} />
            </CardTitle>
            <CardDescription>{t('rules.groupBonus.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {groupPositionPoints.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center gap-4 p-2 md:p-3 rounded-lg bg-muted/50"
                >
                  <div className="text-2xl">{item.emoji}</div>
                  <div className="flex-1">
                    <span className="font-medium">{item.position}</span>
                  </div>
                  <div className={`text-xl font-display font-bold ${item.color}`}>
                    {item.points} {ptsLabel}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">{t('rules.groupBonus.maxLabel')}</strong>{' '}
                {t('rules.groupBonus.maxText', { perGroup: maxGroupBonus, total: maxGroupBonus * 12 })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('rules.groupBonus.tiebreakerNote')}{' '}
                <Link to="/tournament-rules" className="text-primary hover:underline font-medium">
                  {t('rules.groupBonus.viewCriteria')}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Prize Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-chart-4" />
              {t('rules.prizes.title')}
              <CustomBadge isCustom={isPrizesCustom} />
            </CardTitle>
            <CardDescription>
              {t('rules.prizes.entryFee')}: {currencySymbol}{entryFee} • {poolLabel}: {currencySymbol}{totalPool.toFixed(2)} ({participantCount} {t('rules.prizes.participants')})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:gap-4 md:grid-cols-3">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border border-yellow-500/20">
                <div className="text-4xl">🥇</div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('rules.prizes.firstPlace')} ({firstPct}%)</p>
                  <p className="text-2xl font-display font-bold text-yellow-500">{currencySymbol}{firstPrize.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-br from-slate-400/10 to-slate-500/5 border border-slate-400/20">
                <div className="text-4xl">🥈</div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('rules.prizes.secondPlace')} ({secondPct}%)</p>
                  <p className="text-2xl font-display font-bold text-slate-400">{currencySymbol}{secondPrize.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-br from-amber-700/10 to-amber-800/5 border border-amber-700/20">
                <div className="text-4xl">🥉</div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('rules.prizes.thirdPlace')} ({thirdPct}%)</p>
                  <p className="text-2xl font-display font-bold text-amber-700">{currencySymbol}{thirdPrize.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Game Rules */}
        <Card>
          <CardHeader>
            <CardTitle>{t('rules.gameRules.title')}</CardTitle>
            <CardDescription>{t('rules.gameRules.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:gap-4 md:grid-cols-3">
              {gameRules.map((rule) => (
                <div key={rule.key} className="flex flex-col items-center text-center p-3 md:p-4 rounded-lg bg-muted/50">
                  <div className="p-3 rounded-full bg-primary/10 text-primary mb-3">
                    <rule.icon className="h-6 w-6" />
                  </div>
                  <h4 className="font-semibold mb-1">{rule.title}</h4>
                  <p className="text-sm text-muted-foreground">{rule.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
