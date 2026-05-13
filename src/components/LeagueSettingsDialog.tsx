import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useIsAdmin } from '@/hooks/useProfile';
import { Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, RotateCcw, Trophy, Target, Coins, Loader2, EyeOff, ImagePlus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useUpdateLeague } from '@/hooks/useLeagues';
import type { League, StageMultipliers, GroupPositionBonuses } from '@/hooks/useLeagues';
import {
  DEFAULT_SCORING_RULES,
} from '@/components/ScoringRulesCard';
import { supabase } from '@/integrations/supabase/client';
import { LeagueLogo } from '@/components/LeagueLogo';

interface LeagueSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  league: League & { prize_pool?: number; expected_members?: number };
  hasStarted: boolean;
  firstMatchDate: Date | null;
}

const STAGE_KEYS: (keyof StageMultipliers)[] = [
  'group',
  'round_of_32',
  'round_of_16',
  'quarter_final',
  'semi_final',
  'third_place',
  'final',
];

const LIMITS = {
  exact_score: { min: 1, max: 20 },
  outcome: { min: 1, max: 10 },
  multiplier: { min: 0.5, max: 10 },
  bonus: { min: 0, max: 50 },
};

const clamp = (val: number, min: number, max: number) => {
  if (isNaN(val)) return min;
  return Math.max(min, Math.min(max, val));
};

export function LeagueSettingsDialog({
  open,
  onOpenChange,
  league,
  hasStarted,
  firstMatchDate,
}: LeagueSettingsDialogProps) {
  const updateLeague = useUpdateLeague();
  const { t } = useTranslation();
  const readOnly = hasStarted;

  const initialMultipliers = league.stage_multipliers as StageMultipliers;
  const initialBonuses = league.group_position_bonuses as GroupPositionBonuses;
  const initialExpected =
    (league as { expected_members?: number }).expected_members ?? 10;

  const [entryFee, setEntryFee] = useState<number>(league.entry_fee);
  const [expectedMembers, setExpectedMembers] = useState<number>(initialExpected);
  const [first, setFirst] = useState<number>(league.first_place_percentage);
  const [second, setSecond] = useState<number>(league.second_place_percentage);
  const [third, setThird] = useState<number>(league.third_place_percentage);
  const [exactPts, setExactPts] = useState<number>(league.exact_score_points);
  const [outcomePts, setOutcomePts] = useState<number>(league.outcome_points);
  const [multipliers, setMultipliers] = useState<StageMultipliers>(initialMultipliers);
  // A stage is "enabled" if its multiplier !== 1
  const [stageEnabled, setStageEnabled] = useState<Record<keyof StageMultipliers, boolean>>(() => {
    const out = {} as Record<keyof StageMultipliers, boolean>;
    STAGE_KEYS.forEach((k) => {
      out[k] = (initialMultipliers[k] ?? 1) !== 1;
    });
    return out;
  });
  const [bonuses, setBonuses] = useState<GroupPositionBonuses>(initialBonuses);
  const [showPrizePool, setShowPrizePool] = useState<boolean>(league.show_prize_pool ?? true);
  const [showPrizeDistribution, setShowPrizeDistribution] = useState<boolean>(
    (league as { show_prize_distribution?: boolean }).show_prize_distribution ?? true,
  );
  const [hideInviteFromMembers, setHideInviteFromMembers] = useState<boolean>(
    league.hide_invite_from_members ?? false,
  );
  const [logoUrl, setLogoUrl] = useState<string | null>(
    (league as { logo_url?: string | null }).logo_url ?? null,
  );
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoScale, setLogoScale] = useState<number>(
    Number((league as { logo_scale?: number | null }).logo_scale ?? 1),
  );
  const [logoOffsetX, setLogoOffsetX] = useState<number>(
    Number((league as { logo_offset_x?: number | null }).logo_offset_x ?? 0),
  );
  const [logoOffsetY, setLogoOffsetY] = useState<number>(
    Number((league as { logo_offset_y?: number | null }).logo_offset_y ?? 0),
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form whenever dialog opens with fresh league data
  useEffect(() => {
    if (!open) return;
    setEntryFee(league.entry_fee);
    setExpectedMembers(initialExpected);
    setFirst(league.first_place_percentage);
    setSecond(league.second_place_percentage);
    setThird(league.third_place_percentage);
    setExactPts(league.exact_score_points);
    setOutcomePts(league.outcome_points);
    setMultipliers(initialMultipliers);
    setBonuses(initialBonuses);
    const enabled = {} as Record<keyof StageMultipliers, boolean>;
    STAGE_KEYS.forEach((k) => {
      enabled[k] = (initialMultipliers[k] ?? 1) !== 1;
    });
    setStageEnabled(enabled);
    setShowPrizePool(league.show_prize_pool ?? true);
    setShowPrizeDistribution((league as { show_prize_distribution?: boolean }).show_prize_distribution ?? true);
    setHideInviteFromMembers(league.hide_invite_from_members ?? false);
    setLogoUrl((league as { logo_url?: string | null }).logo_url ?? null);
    setLogoScale(Number((league as { logo_scale?: number | null }).logo_scale ?? 1));
    setLogoOffsetX(Number((league as { logo_offset_x?: number | null }).logo_offset_x ?? 0));
    setLogoOffsetY(Number((league as { logo_offset_y?: number | null }).logo_offset_y ?? 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, league.id]);

  const { data: isAdmin } = useIsAdmin();

  const prizePool = useMemo(
    () => Math.max(0, entryFee) * Math.max(0, expectedMembers),
    [entryFee, expectedMembers],
  );

  const handleFirstChange = (val: number) => {
    const f = clamp(val, 0, 100);
    let s = second;
    let t = third;
    const remaining = 100 - f;
    if (s + t > remaining) {
      const total = s + t;
      if (total > 0) {
        const ratio = s / total;
        s = Math.round(remaining * ratio);
        t = remaining - s;
      } else {
        s = 0;
        t = remaining;
      }
    } else if (s + t < remaining) {
      t = remaining - s;
    }
    setFirst(f);
    setSecond(Math.max(0, s));
    setThird(Math.max(0, t));
  };

  const handleSecondChange = (val: number) => {
    const maxS = 100 - first;
    const s = clamp(val, 0, maxS);
    setSecond(s);
    setThird(100 - first - s);
  };

  const toggleStage = (stage: keyof StageMultipliers, enabled: boolean) => {
    setStageEnabled((prev) => ({ ...prev, [stage]: enabled }));
    setMultipliers((prev) => ({
      ...prev,
      [stage]: enabled ? (prev[stage] === 1 ? DEFAULT_SCORING_RULES.stage_multipliers[stage] : prev[stage]) : 1,
    }));
  };

  const updateMultiplier = (stage: keyof StageMultipliers, val: number) => {
    setMultipliers((prev) => ({
      ...prev,
      [stage]: clamp(val, LIMITS.multiplier.min, LIMITS.multiplier.max),
    }));
  };

  const updateBonus = (pos: 1 | 2 | 3 | 4, val: number) => {
    setBonuses((prev) => ({
      ...prev,
      [pos]: clamp(val, LIMITS.bonus.min, LIMITS.bonus.max),
    }));
  };

  const handleResetScoring = () => {
    setExactPts(DEFAULT_SCORING_RULES.exact_score_points);
    setOutcomePts(DEFAULT_SCORING_RULES.outcome_points);
    setMultipliers(DEFAULT_SCORING_RULES.stage_multipliers);
    setBonuses({
      1: DEFAULT_SCORING_RULES.group_position_bonuses[1],
      2: DEFAULT_SCORING_RULES.group_position_bonuses[2],
      3: DEFAULT_SCORING_RULES.group_position_bonuses[3],
      4: DEFAULT_SCORING_RULES.group_position_bonuses[4],
    });
    const enabled = {} as Record<keyof StageMultipliers, boolean>;
    STAGE_KEYS.forEach((k) => {
      enabled[k] = DEFAULT_SCORING_RULES.stage_multipliers[k] !== 1;
    });
    setStageEnabled(enabled);
  };

  const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
  const MAX_LOGO_BYTES = 2 * 1024 * 1024;

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      toast.error(t('leagues.settings.logo.errorInvalidType'));
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error(t('leagues.settings.logo.errorTooLarge'));
      return;
    }
    setLogoUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const path = `${league.id}/logo.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('league-logos')
        .upload(path, file, { upsert: true, contentType: file.type, cacheControl: '3600' });
      if (uploadError) throw uploadError;
      const { data: pub } = supabase.storage.from('league-logos').getPublicUrl(path);
      const cacheBusted = `${pub.publicUrl}?v=${Date.now()}`;
      await updateLeague.mutateAsync({
        id: league.id,
        logo_url: cacheBusted,
      } as Partial<League> & { id: string });
      setLogoUrl(cacheBusted);
      toast.success(t('leagues.settings.logo.uploaded'));
    } catch (err) {
      console.error('Logo upload failed', err);
      toast.error(t('leagues.settings.logo.errorUpload'));
    } finally {
      setLogoUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!logoUrl) return;
    setLogoUploading(true);
    try {
      // Best-effort delete of any object under <league.id>/
      const { data: list } = await supabase.storage
        .from('league-logos')
        .list(league.id);
      if (list && list.length > 0) {
        await supabase.storage
          .from('league-logos')
          .remove(list.map((o) => `${league.id}/${o.name}`));
      }
      await updateLeague.mutateAsync({
        id: league.id,
        logo_url: null,
      } as Partial<League> & { id: string });
      setLogoUrl(null);
      toast.success(t('leagues.settings.logo.removed'));
    } catch (err) {
      console.error('Logo removal failed', err);
      toast.error(t('leagues.settings.logo.errorUpload'));
    } finally {
      setLogoUploading(false);
    }
  };

  const handleSave = async () => {
    if (readOnly) return;
    const total = first + second + third;
    if (Math.abs(total - 100) > 0.1) {
      toast.error(t('leagues.settings.errors.distributionTotal'));
      return;
    }
    if (entryFee < 0 || expectedMembers < 3) {
      toast.error(t('leagues.settings.errors.feeMembers'));
      return;
    }

    try {
      await updateLeague.mutateAsync({
        id: league.id,
        entry_fee: entryFee,
        expected_members: expectedMembers,
        prize_pool: prizePool,
        first_place_percentage: Math.round(first),
        second_place_percentage: Math.round(second),
        third_place_percentage: Math.round(third),
        exact_score_points: exactPts,
        outcome_points: outcomePts,
        stage_multipliers: multipliers,
        group_position_bonuses: bonuses,
        show_prize_pool: showPrizePool,
        show_prize_distribution: showPrizeDistribution,
        hide_invite_from_members: hideInviteFromMembers,
        logo_scale: logoScale,
        logo_offset_x: logoOffsetX,
        logo_offset_y: logoOffsetY,
      } as Partial<League> & { id: string; expected_members: number; prize_pool: number });
      onOpenChange(false);
    } catch {
      // toast handled by mutation
    }
  };

  const sampleGroup = exactPts * (multipliers.group ?? 1);
  const sampleFinal = exactPts * (multipliers.final ?? 1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('leagues.settings.title')}</DialogTitle>
          <DialogDescription>{t('leagues.settings.description')}</DialogDescription>
        </DialogHeader>

        {readOnly && (
          <Alert className="border-yellow-500/40 bg-yellow-500/5">
            <Lock className="h-4 w-4" />
            <AlertDescription>{t('leagues.settings.lockedAlert', { date: firstMatchDate ? ` (${format(firstMatchDate, 'PPp')})` : '' })}</AlertDescription>
          </Alert>
        )}
        {!readOnly && firstMatchDate && (
          <Alert>
            <AlertDescription className="text-xs text-muted-foreground">{t('leagues.settings.editableUntil', { date: firstMatchDate ? t('leagues.settings.on', { date: format(firstMatchDate, 'PPp') }) : '' })}</AlertDescription>
          </Alert>
        )}

        <fieldset disabled={readOnly} className="space-y-6">
          {/* League Logo */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <ImagePlus className="h-4 w-4 text-primary" />
              <h3 className="font-medium">{t('leagues.settings.logo.title')}</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('leagues.settings.logo.description')}
            </p>
            <div className="flex items-center gap-4">
              <LeagueLogo
                url={logoUrl}
                name={league.name}
                size="xl"
                scale={logoScale}
                offsetX={logoOffsetX}
                offsetY={logoOffsetY}
              />
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={handleLogoFileChange}
                  disabled={readOnly || logoUploading}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={readOnly || logoUploading}
                  >
                    {logoUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t('leagues.settings.logo.uploading')}
                      </>
                    ) : (
                      <>
                        <ImagePlus className="h-4 w-4 mr-2" />
                        {logoUrl
                          ? t('leagues.settings.logo.replaceLabel')
                          : t('leagues.settings.logo.uploadLabel')}
                      </>
                    )}
                  </Button>
                  {logoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveLogo}
                      disabled={readOnly || logoUploading}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('leagues.settings.logo.removeLabel')}
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {t('leagues.settings.logo.hint')}
                </p>
              </div>
            </div>
            {logoUrl && (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">
                    {t('leagues.settings.logo.adjust.title', 'Adjust display')}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    disabled={readOnly}
                    onClick={() => {
                      setLogoScale(1);
                      setLogoOffsetX(0);
                      setLogoOffsetY(0);
                    }}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    {t('leagues.settings.logo.adjust.reset', 'Reset')}
                  </Button>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{t('leagues.settings.logo.adjust.zoom', 'Zoom')}</span>
                    <span>{Math.round(logoScale * 100)}%</span>
                  </div>
                  <Slider
                    value={[logoScale]}
                    min={0.5}
                    max={3}
                    step={0.05}
                    disabled={readOnly}
                    onValueChange={(v) => setLogoScale(v[0])}
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{t('leagues.settings.logo.adjust.offsetX', 'Horizontal offset')}</span>
                    <span>{Math.round(logoOffsetX * 100)}%</span>
                  </div>
                  <Slider
                    value={[logoOffsetX]}
                    min={-1}
                    max={1}
                    step={0.02}
                    disabled={readOnly}
                    onValueChange={(v) => setLogoOffsetX(v[0])}
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{t('leagues.settings.logo.adjust.offsetY', 'Vertical offset')}</span>
                    <span>{Math.round(logoOffsetY * 100)}%</span>
                  </div>
                  <Slider
                    value={[logoOffsetY]}
                    min={-1}
                    max={1}
                    step={0.02}
                    disabled={readOnly}
                    onValueChange={(v) => setLogoOffsetY(v[0])}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {t('leagues.settings.logo.adjust.hint', 'Use these to fine-tune cropping inside the circular frame. Saved with the rest of the settings.')}
                </p>
              </div>
            )}
            <Separator />
          </section>

          {/* Prize Pool */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-primary" />
                <h3 className="font-medium">{t('leagues.settings.prizePool.title')}</h3>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="show_prize_pool" className="text-xs text-muted-foreground">{t('leagues.settings.prizePool.showInDashboard')}</Label>
                <Switch
                  id="show_prize_pool"
                  checked={showPrizePool}
                  onCheckedChange={setShowPrizePool}
                />
              </div>
            </div>
            {!showPrizePool && (
              <p className="text-xs text-muted-foreground">{t('leagues.settings.prizePool.hiddenNote')}</p>
            )}
            <div className={cn("grid grid-cols-2 gap-3", !showPrizePool && "opacity-60")}>
              <div className="space-y-1.5">
                <Label htmlFor="entry_fee">{t('leagues.settings.prizePool.entryFee', { currency: league.currency })}</Label>
                <Input
                  id="entry_fee"
                  type="number"
                  min="0"
                  step="10"
                  value={entryFee}
                  onChange={(e) => setEntryFee(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expected_members">{t('leagues.settings.prizePool.expectedMembers')}</Label>
                <Input
                  id="expected_members"
                  type="number"
                  min="3"
                  step="1"
                  value={expectedMembers}
                  onChange={(e) => setExpectedMembers(Math.max(3, Number(e.target.value)))}
                />
              </div>
            </div>
            <div className="text-sm rounded-lg bg-muted/50 px-3 py-2">{t('leagues.settings.prizePool.totalLabel')}{' '}<span className="font-semibold">{prizePool.toLocaleString()} {league.currency}</span></div>
          </section>

          <Separator />

          {/* Privacy */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <EyeOff className="h-4 w-4 text-primary" />
              <h3 className="font-medium">{t('leagues.settings.privacy.title')}</h3>
            </div>
            <div className="flex items-start justify-between gap-4 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
              <div className="space-y-0.5">
                <Label htmlFor="hide_invite_from_members" className="text-sm">{t('leagues.settings.privacy.hideInviteLabel')}</Label>
                <p className="text-xs text-muted-foreground">{t('leagues.settings.privacy.hideInviteDesc')}</p>
              </div>
              <Switch
                id="hide_invite_from_members"
                checked={hideInviteFromMembers}
                onCheckedChange={setHideInviteFromMembers}
              />
            </div>
          </section>

          <Separator />

          {/* Prize Distribution */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                <h3 className="font-medium">{t('leagues.settings.distribution.title')}</h3>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="show_prize_distribution" className="text-xs text-muted-foreground">
                  {t('leagues.settings.distribution.showInDashboard', 'Show in dashboard')}
                </Label>
                <Switch
                  id="show_prize_distribution"
                  checked={showPrizeDistribution}
                  onCheckedChange={setShowPrizeDistribution}
                />
              </div>
            </div>
            {!showPrizeDistribution && (
              <p className="text-xs text-muted-foreground">
                {t('leagues.settings.distribution.hiddenNote', 'Prize distribution is hidden from the league dashboard.')}
              </p>
            )}
            <div className={cn("grid grid-cols-3 gap-3", !showPrizeDistribution && "opacity-60")}>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('leagues.settings.distribution.first')}</Label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={first}
                    onChange={(e) => handleFirstChange(Number(e.target.value))}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {((prizePool * first) / 100).toLocaleString()} {league.currency}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('leagues.settings.distribution.second')}</Label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min="0"
                    max={100 - first}
                    value={second}
                    onChange={(e) => handleSecondChange(Number(e.target.value))}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {((prizePool * second) / 100).toLocaleString()} {league.currency}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('leagues.settings.distribution.third')}</Label>
                <div className="flex items-center gap-1">
                  <Input type="number" value={third} disabled />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {((prizePool * third) / 100).toLocaleString()} {league.currency}
                </p>
              </div>
            </div>
          </section>

          <Separator />

          {/* Scoring Rules */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <h3 className="font-medium">{t('leagues.settings.scoring.title')}</h3>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetScoring}
                className="gap-2"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t('leagues.settings.scoring.reset')}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t('leagues.settings.scoring.exactScore')}</Label>
                <Input
                  type="number"
                  min={LIMITS.exact_score.min}
                  max={LIMITS.exact_score.max}
                  value={exactPts}
                  onChange={(e) =>
                    setExactPts(clamp(Number(e.target.value), LIMITS.exact_score.min, LIMITS.exact_score.max))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('leagues.settings.scoring.correctOutcome')}</Label>
                <Input
                  type="number"
                  min={LIMITS.outcome.min}
                  max={LIMITS.outcome.max}
                  value={outcomePts}
                  onChange={(e) =>
                    setOutcomePts(clamp(Number(e.target.value), LIMITS.outcome.min, LIMITS.outcome.max))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('leagues.settings.scoring.stageMultipliers')}</Label>
              <p className="text-xs text-muted-foreground">{t('leagues.settings.scoring.stageMultipliersHint')}</p>
              <div className="space-y-2 rounded-lg border p-3">
                {STAGE_KEYS.map((key) => {
                  const label = t(`leagues.settings.scoring.stages.${key}`);
                  const enabled = stageEnabled[key];
                  return (
                    <div
                      key={key}
                      className={cn(
                        'flex items-center justify-between gap-3',
                        !enabled && 'opacity-60',
                      )}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Switch
                          checked={enabled}
                          onCheckedChange={(v) => toggleStage(key, v)}
                        />
                        <span className="text-sm">{label}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={LIMITS.multiplier.min}
                          max={LIMITS.multiplier.max}
                          step="0.5"
                          value={multipliers[key]}
                          disabled={!enabled}
                          onChange={(e) => updateMultiplier(key, Number(e.target.value))}
                          className="w-20 h-8 text-sm"
                        />
                        <span className="text-xs text-muted-foreground w-3">×</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('leagues.settings.scoring.groupBonuses')}</Label>
              <p className="text-xs text-muted-foreground">{t('leagues.settings.scoring.groupBonusesHint')}</p>
              <div className="grid grid-cols-4 gap-2">
                {([
                  [1, 'first'],
                  [2, 'second'],
                  [3, 'third'],
                  [4, 'fourth'],
                ] as [1 | 2 | 3 | 4, 'first' | 'second' | 'third' | 'fourth'][]).map(([pos, key]) => {
                  const label = t(`leagues.settings.scoring.positions.${key}`);
                  return (
                  <div key={pos} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{label}</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={LIMITS.bonus.min}
                        max={LIMITS.bonus.max}
                        value={bonuses[pos]}
                        onChange={(e) => updateBonus(pos, Number(e.target.value))}
                        className="h-8 text-sm"
                      />
                      <span className="text-xs text-muted-foreground">{t('leagues.settings.scoring.ptsSuffix')}</span>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm space-y-1">
              <p className="text-xs font-medium text-muted-foreground">{t('leagues.settings.scoring.examplePoints')}</p>
              <p className="text-xs">{t('leagues.settings.scoring.exampleGroup')} <span className="font-semibold">{sampleGroup} {t('leagues.settings.scoring.ptsSuffix')}</span></p>
              <p className="text-xs">{t('leagues.settings.scoring.exampleFinal')} <span className="font-semibold">{sampleFinal} {t('leagues.settings.scoring.ptsSuffix')}</span></p>
            </div>
          </section>
        </fieldset>

        <DialogFooter>
          {isAdmin && (
            <Button asChild variant="secondary" onClick={() => onOpenChange(false)}>
              <Link to={`/leagues/${league.id}`}>
                <Eye className="h-4 w-4 mr-2" />
                {t('leagues.settings.actions.enterAsUser', 'Enter as user')}
              </Link>
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {readOnly ? t('leagues.settings.actions.close') : t('leagues.settings.actions.cancel')}
          </Button>
          {!readOnly && (
            <Button onClick={handleSave} disabled={updateLeague.isPending}>
              {updateLeague.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('leagues.settings.actions.saving')}
                </>
              ) : (
                t('leagues.settings.actions.save')
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}