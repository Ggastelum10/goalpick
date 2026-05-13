import React, { memo, useMemo, useRef, useState, useEffect } from 'react';
import { usePinchZoom } from '@/hooks/usePinchZoom';
import { useTranslation } from 'react-i18next';
import { KnockoutBracketData, ResolvedMatch } from '@/lib/knockoutBracketResolver';
import { BracketMatchCard } from './BracketMatchCard';
import { BracketConnectors } from './BracketConnectors';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Minus, Plus, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface BirdsEyeKnockoutBracketProps {
  bracket: KnockoutBracketData;
  showScores: boolean;
  zoomLevel: number;
}

const stageLabels = {
  round_of_32: 'R32',
  round_of_16: 'R16',
  quarter_final: 'QF',
  semi_final: 'SF',
  third_place: '3rd',
  final: 'Final',
};

interface RoundColumnProps {
  matches: ResolvedMatch[];
  showScores: boolean;
  side: 'left' | 'right' | 'center';
  stage: string;
  compact: boolean;
  baseDelay?: number;
}

const RoundColumn = memo(function RoundColumn({
  matches,
  showScores,
  side,
  stage,
  compact,
  baseDelay = 0,
}: RoundColumnProps) {
  const { t } = useTranslation();
  
  // Calculate spacing between matches to allow for connectors
  const getSpacing = () => {
    switch (stage) {
      case 'round_of_32': return 'gap-2';
      case 'round_of_16': return 'gap-4';
      case 'quarter_final': return 'gap-8';
      case 'semi_final': return 'gap-16';
      default: return 'gap-4';
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* Stage label - hidden on desktop (shown in connector area) */}
      <div className="lg:hidden mb-2">
        <Badge variant="outline" className="text-[10px] px-2 py-0.5">
          {stageLabels[stage as keyof typeof stageLabels] || stage}
        </Badge>
      </div>
      
      {/* Matches */}
      <div className={cn('flex flex-col', getSpacing())}>
        {matches.map((match, idx) => (
          <BracketMatchCard
            key={match.matchId}
            match={match}
            showScores={showScores}
            compact={compact}
            showMetadata={!compact}
            side={side}
            animationDelay={baseDelay + idx * 50}
          />
        ))}
      </div>
    </div>
  );
});

const ChampionDisplay = memo(function ChampionDisplay({
  champion,
}: {
  champion: { name: string; flag?: string | null } | null;
}) {
  const { t } = useTranslation();

  if (!champion) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-center py-4 text-muted-foreground">
          <Trophy className="h-5 w-5 mr-2" />
          <span className="text-sm">{t('matchesOverview.predictToSeeChampion')}</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-yellow-500/10 via-amber-400/5 to-yellow-500/10 border-yellow-500/30 animate-bounce-in">
      <CardContent className="flex items-center justify-center gap-3 py-4">
        <Trophy className="h-8 w-8 text-yellow-500" />
        <div className="flex items-center gap-2">
          {champion.flag && (
            <img
              src={champion.flag}
              alt=""
              className="h-8 w-12 object-cover rounded-md shadow-sm"
            />
          )}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {t('matchesOverview.yourChampion')}
            </p>
            <p className="font-bold text-lg">{champion.name}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

const MobileVerticalBracket = memo(function MobileVerticalBracket({
  bracket,
  showScores,
}: {
  bracket: KnockoutBracketData;
  showScores: boolean;
}) {
  const { t } = useTranslation();
  const stages = [
    { key: 'round_of_32', matches: bracket.round_of_32 },
    { key: 'round_of_16', matches: bracket.round_of_16 },
    { key: 'quarter_final', matches: bracket.quarter_final },
    { key: 'semi_final', matches: bracket.semi_final },
    { key: 'third_place', matches: bracket.third_place },
    { key: 'final', matches: bracket.final },
  ].filter(s => s.matches.length > 0);

  // Pinch-to-zoom via custom hook
  const { zoom: mobileZoom, containerRef: touchContainerRef, containerStyle, contentStyle, isZoomed, zoomIn: mobileZoomIn, zoomOut: mobileZoomOut, resetZoom } = usePinchZoom();

  // Split matches for horizontal bracket grid (used when zoomed out)
  const splitMatches = useMemo(() => ({
    r32Left: bracket.round_of_32.slice(0, 8),
    r32Right: bracket.round_of_32.slice(8, 16),
    r16Left: bracket.round_of_16.slice(0, 4),
    r16Right: bracket.round_of_16.slice(4, 8),
    qfLeft: bracket.quarter_final.slice(0, 2),
    qfRight: bracket.quarter_final.slice(2, 4),
    sfLeft: bracket.semi_final.slice(0, 1),
    sfRight: bracket.semi_final.slice(1, 2),
    final: bracket.final,
    thirdPlace: bracket.third_place,
  }), [bracket]);

  const isBirdsEye = mobileZoom < 1;

  // Auto-fit bird's eye zoom to container width
  const birdsEyeContainerRef = useRef<HTMLDivElement>(null);
  const birdsEyeContentRef = useRef<HTMLDivElement>(null);
  const [fitZoom, setFitZoom] = useState(0.27);
  const [scaledHeight, setScaledHeight] = useState<number | undefined>(undefined);

  // Effective zoom: fitZoom is base (at first zoom-out step 0.8), further steps scale down
  const effectiveZoom = isBirdsEye ? fitZoom * (mobileZoom / 0.8) : fitZoom;
  
  useEffect(() => {
    const el = birdsEyeContainerRef.current;
    if (!isBirdsEye || !el) return;
    
    const recalc = () => {
      const containerWidth = el.clientWidth;
      const bracketWidth = 1424;
      const calculated = containerWidth / bracketWidth;
      setFitZoom(Math.max(0.2, Math.min(0.95, calculated)));
    };
    
    recalc();
    const observer = new ResizeObserver(recalc);
    observer.observe(el);
    return () => observer.disconnect();
  }, [isBirdsEye]);

  // Update scaled height when effective zoom changes
  useEffect(() => {
    if (!isBirdsEye) return;
    requestAnimationFrame(() => {
      const content = birdsEyeContentRef.current;
      if (content) {
        setScaledHeight(content.scrollHeight * effectiveZoom);
      }
    });
  }, [isBirdsEye, effectiveZoom]);

  return (
    <div className="space-y-6 relative">
      <ChampionDisplay champion={bracket.champion} />
      
      {/* Zoom indicator */}
      {isZoomed && (
        <div className="flex justify-center">
          <Badge variant="outline" className="text-[10px] gap-1">
            {Math.round(mobileZoom * 100)}% — {isBirdsEye ? "Bird's Eye View" : 'Double-tap to reset'}
          </Badge>
        </div>
      )}

      {isBirdsEye ? (
        /* ── Bird's eye: horizontal bracket grid auto-fit ── */
        <div 
          ref={birdsEyeContainerRef} 
          className="relative w-full overflow-hidden"
          style={{ height: scaledHeight ? `${scaledHeight}px` : 'auto' }}
        >
          <div
            ref={birdsEyeContentRef}
            style={{
              width: '1400px',
              transform: `scale(${effectiveZoom})`,
              transformOrigin: 'top left',
            }}
          >
            {/* 9-Column Grid Layout */}
            <div className="grid grid-cols-9 gap-3 w-[1400px] items-start p-3">
              {/* Left Side: R32 → SF */}
              <RoundColumn matches={splitMatches.r32Left} showScores={showScores} side="left" stage="round_of_32" compact baseDelay={0} />
              <RoundColumn matches={splitMatches.r16Left} showScores={showScores} side="left" stage="round_of_16" compact baseDelay={400} />
              <RoundColumn matches={splitMatches.qfLeft} showScores={showScores} side="left" stage="quarter_final" compact baseDelay={600} />
              <RoundColumn matches={splitMatches.sfLeft} showScores={showScores} side="left" stage="semi_final" compact baseDelay={700} />

              {/* Center: Final + 3rd Place */}
              <div className="flex flex-col items-center justify-center gap-6">
                <div className="text-center space-y-2">
                  <Badge className="bg-primary/10 text-primary border-primary/30">
                    {t('knockoutView.final')}
                  </Badge>
                  {splitMatches.final.map((match, idx) => (
                    <BracketMatchCard key={match.matchId} match={match} showScores={showScores} compact={false} showMetadata animationDelay={800 + idx * 100} />
                  ))}
                </div>
                <div className="text-center space-y-2">
                  <Badge variant="outline" className="text-[10px]">
                    {t('knockoutView.thirdPlace')}
                  </Badge>
                  {splitMatches.thirdPlace.map((match, idx) => (
                    <BracketMatchCard key={match.matchId} match={match} showScores={showScores} compact showMetadata animationDelay={900 + idx * 100} />
                  ))}
                </div>
              </div>

              {/* Right Side: SF → R32 */}
              <RoundColumn matches={splitMatches.sfRight} showScores={showScores} side="right" stage="semi_final" compact baseDelay={700} />
              <RoundColumn matches={splitMatches.qfRight} showScores={showScores} side="right" stage="quarter_final" compact baseDelay={600} />
              <RoundColumn matches={splitMatches.r16Right} showScores={showScores} side="right" stage="round_of_16" compact baseDelay={400} />
              <RoundColumn matches={splitMatches.r32Right} showScores={showScores} side="right" stage="round_of_32" compact baseDelay={0} />
            </div>

            {/* Stage Labels Row */}
            <div className="grid grid-cols-9 gap-3 w-[1400px] px-3 mt-1">
              {['R32', 'R16', 'QF', 'SF', '', 'SF', 'QF', 'R16', 'R32'].map((label, idx) => (
                <div key={idx} className="text-center">
                  {label && (
                    <Badge variant="outline" className="text-[10px] px-2">
                      {label}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ── Normal mobile: vertical card grid ── */
        <div
          ref={touchContainerRef}
          style={containerStyle}
        >
          <div style={contentStyle}>
            {stages.map((stage, stageIdx) => (
              <div key={stage.key} className="space-y-3">
                {/* Sticky header */}
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-2 border-b">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">
                      {t(`knockoutView.${stage.key === 'round_of_32' ? 'roundOf32' : 
                        stage.key === 'round_of_16' ? 'roundOf16' : 
                        stage.key === 'quarter_final' ? 'quarterFinals' : 
                        stage.key === 'semi_final' ? 'semiFinals' : 
                        stage.key === 'third_place' ? 'thirdPlace' : 'final'}`)}
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      {stage.matches.filter(m => m.prediction).length}/{stage.matches.length}
                    </Badge>
                  </div>
                </div>
                
                {/* Match grid */}
                <div className="grid grid-cols-2 gap-2">
                  {stage.matches.map((match, idx) => (
                    <BracketMatchCard
                      key={match.matchId}
                      match={match}
                      showScores={showScores}
                      compact
                      animationDelay={stageIdx * 100 + idx * 30}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating zoom controls — fixed to viewport */}
      <div className="fixed bottom-20 right-3 pointer-events-none z-50">
        <div className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-full bg-background/90 backdrop-blur-sm border border-border/50 shadow-lg">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={mobileZoomOut}
            disabled={mobileZoom <= 0.4}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="text-xs font-semibold w-10 text-center font-mono tabular-nums text-muted-foreground">
            {Math.round(mobileZoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={mobileZoomIn}
            disabled={mobileZoom >= 3}
          >
            <Plus className="h-4 w-4" />
          </Button>
          {isZoomed && (
            <>
              <div className="w-px h-5 bg-border/60 mx-0.5" />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={resetZoom}
                title="Reset zoom"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

export const BirdsEyeKnockoutBracket = memo(function BirdsEyeKnockoutBracket({
  bracket,
  showScores,
  zoomLevel,
}: BirdsEyeKnockoutBracketProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Update container width on resize
  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Split matches for left/right sides
  const splitMatches = useMemo(() => {
    const r32 = bracket.round_of_32;
    const r16 = bracket.round_of_16;
    const qf = bracket.quarter_final;
    const sf = bracket.semi_final;

    return {
      r32Left: r32.slice(0, 8),
      r32Right: r32.slice(8, 16),
      r16Left: r16.slice(0, 4),
      r16Right: r16.slice(4, 8),
      qfLeft: qf.slice(0, 2),
      qfRight: qf.slice(2, 4),
      sfLeft: sf.slice(0, 1),
      sfRight: sf.slice(1, 2),
      final: bracket.final,
      thirdPlace: bracket.third_place,
    };
  }, [bracket]);

  const scale = zoomLevel / 100;
  const compact = zoomLevel < 100;

  // Mobile layout
  if (isMobile) {
    return <MobileVerticalBracket bracket={bracket} showScores={showScores} />;
  }

  // Desktop horizontal bracket
  return (
    <div ref={containerRef} className="space-y-4">
      {/* Champion Display */}
      <ChampionDisplay champion={bracket.champion} />

      {/* Bracket Container */}
      <div 
        className="overflow-x-auto pb-4"
        style={{ 
          minWidth: '100%',
        }}
      >
        <div
          className="relative"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            width: `${100 / scale}%`,
          }}
        >
          {/* 9-Column Grid Layout */}
          <div className="grid grid-cols-9 gap-4 min-w-[1400px] items-start p-4">
            {/* Left Side: R32 → SF */}
            <RoundColumn
              matches={splitMatches.r32Left}
              showScores={showScores}
              side="left"
              stage="round_of_32"
              compact={compact}
              baseDelay={0}
            />
            <RoundColumn
              matches={splitMatches.r16Left}
              showScores={showScores}
              side="left"
              stage="round_of_16"
              compact={compact}
              baseDelay={400}
            />
            <RoundColumn
              matches={splitMatches.qfLeft}
              showScores={showScores}
              side="left"
              stage="quarter_final"
              compact={compact}
              baseDelay={600}
            />
            <RoundColumn
              matches={splitMatches.sfLeft}
              showScores={showScores}
              side="left"
              stage="semi_final"
              compact={compact}
              baseDelay={700}
            />

            {/* Center: Final + 3rd Place */}
            <div className="flex flex-col items-center justify-center gap-8">
              <div className="text-center space-y-2">
                <Badge className="bg-primary/10 text-primary border-primary/30">
                  {t('knockoutView.final')}
                </Badge>
                {splitMatches.final.map((match, idx) => (
                  <BracketMatchCard
                    key={match.matchId}
                    match={match}
                    showScores={showScores}
                    compact={false}
                    showMetadata
                    animationDelay={800 + idx * 100}
                  />
                ))}
              </div>
              
              <div className="text-center space-y-2">
                <Badge variant="outline" className="text-[10px]">
                  {t('knockoutView.thirdPlace')}
                </Badge>
                {splitMatches.thirdPlace.map((match, idx) => (
                  <BracketMatchCard
                    key={match.matchId}
                    match={match}
                    showScores={showScores}
                    compact={compact}
                    showMetadata
                    animationDelay={900 + idx * 100}
                  />
                ))}
              </div>
            </div>

            {/* Right Side: SF → R32 */}
            <RoundColumn
              matches={splitMatches.sfRight}
              showScores={showScores}
              side="right"
              stage="semi_final"
              compact={compact}
              baseDelay={700}
            />
            <RoundColumn
              matches={splitMatches.qfRight}
              showScores={showScores}
              side="right"
              stage="quarter_final"
              compact={compact}
              baseDelay={600}
            />
            <RoundColumn
              matches={splitMatches.r16Right}
              showScores={showScores}
              side="right"
              stage="round_of_16"
              compact={compact}
              baseDelay={400}
            />
            <RoundColumn
              matches={splitMatches.r32Right}
              showScores={showScores}
              side="right"
              stage="round_of_32"
              compact={compact}
              baseDelay={0}
            />
          </div>

          {/* Stage Labels Row */}
          <div className="hidden lg:grid grid-cols-9 gap-4 min-w-[1400px] px-4 mt-2">
            {['R32', 'R16', 'QF', 'SF', '', 'SF', 'QF', 'R16', 'R32'].map((label, idx) => (
              <div key={idx} className="text-center">
                {label && (
                  <Badge variant="outline" className="text-[10px] px-2">
                    {label}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

export default BirdsEyeKnockoutBracket;
