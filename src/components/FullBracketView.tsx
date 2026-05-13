import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { usePinchZoom } from '@/hooks/usePinchZoom';
import { KnockoutBracketData, ResolvedMatch } from '@/lib/knockoutBracketResolver';
import { KnockoutMatchNode } from './KnockoutMatchNode';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Minus, Plus, Maximize2, ChevronDown, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface FullBracketViewProps {
  bracket: KnockoutBracketData;
  leagueId?: string;
  onMatchClick: (match: ResolvedMatch) => void;
}

const STAGE_LABELS: Record<string, string> = {
  round_of_32: 'Round of 32',
  round_of_16: 'Round of 16',
  quarter_final: 'Quarter Finals',
  semi_final: 'Semi Finals',
  third_place: '3rd Place',
  final: 'Final',
};

const STAGE_SHORT_LABELS: Record<string, string> = {
  round_of_32: 'R32',
  round_of_16: 'R16',
  quarter_final: 'QF',
  semi_final: 'SF',
  third_place: '3rd',
  final: 'Final',
};

// ─── Connector definitions ───────────────────────────────────────────
interface ConnectorDef {
  sources: string[];
  target: string;
  side: 'left' | 'right';
}

const CONNECTOR_DEFS: ConnectorDef[] = [
  // Left side: R32 → R16
  { sources: ['l-r32-0', 'l-r32-1'], target: 'l-r16-0', side: 'left' },
  { sources: ['l-r32-2', 'l-r32-3'], target: 'l-r16-1', side: 'left' },
  { sources: ['l-r32-4', 'l-r32-5'], target: 'l-r16-2', side: 'left' },
  { sources: ['l-r32-6', 'l-r32-7'], target: 'l-r16-3', side: 'left' },
  // Left side: R16 → QF
  { sources: ['l-r16-0', 'l-r16-1'], target: 'l-qf-0', side: 'left' },
  { sources: ['l-r16-2', 'l-r16-3'], target: 'l-qf-1', side: 'left' },
  // Left side: QF → SF
  { sources: ['l-qf-0', 'l-qf-1'], target: 'l-sf-0', side: 'left' },
  // Left side: SF → Final
  { sources: ['l-sf-0'], target: 'c-final-0', side: 'left' },

  // Right side: R32 → R16
  { sources: ['r-r32-0', 'r-r32-1'], target: 'r-r16-0', side: 'right' },
  { sources: ['r-r32-2', 'r-r32-3'], target: 'r-r16-1', side: 'right' },
  { sources: ['r-r32-4', 'r-r32-5'], target: 'r-r16-2', side: 'right' },
  { sources: ['r-r32-6', 'r-r32-7'], target: 'r-r16-3', side: 'right' },
  // Right side: R16 → QF
  { sources: ['r-r16-0', 'r-r16-1'], target: 'r-qf-0', side: 'right' },
  { sources: ['r-r16-2', 'r-r16-3'], target: 'r-qf-1', side: 'right' },
  // Right side: QF → SF
  { sources: ['r-qf-0', 'r-qf-1'], target: 'r-sf-0', side: 'right' },
  // Right side: SF → Final
  { sources: ['r-sf-0'], target: 'c-final-0', side: 'right' },
];

// ─── SVG connector path computation ──────────────────────────────────
interface ConnectorPathInfo {
  d: string;
  hasPrediction: boolean;
}

function computeConnectorPaths(bracketEl: HTMLElement, scale: number): ConnectorPathInfo[] {
  const containerRect = bracketEl.getBoundingClientRect();

  const getPos = (pos: string) => {
    const el = bracketEl.querySelector(`[data-bracket-pos="${pos}"]`);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    // Check if match has prediction via data attribute
    const hasPrediction = el.getAttribute('data-has-prediction') === 'true';
    return {
      left: (rect.left - containerRect.left) / scale,
      right: (rect.right - containerRect.left) / scale,
      centerY: (rect.top - containerRect.top + rect.height / 2) / scale,
      hasPrediction,
    };
  };

  const paths: ConnectorPathInfo[] = [];

  for (const conn of CONNECTOR_DEFS) {
    const target = getPos(conn.target);
    if (!target) continue;

    if (conn.sources.length === 2) {
      const a = getPos(conn.sources[0]);
      const b = getPos(conn.sources[1]);
      if (!a || !b) continue;

      const bothPredicted = a.hasPrediction && b.hasPrediction;

      if (conn.side === 'left') {
        const midX = (a.right + target.left) / 2;
        const midY = (a.centerY + b.centerY) / 2;
        paths.push({
          d: `M ${a.right} ${a.centerY} H ${midX} V ${midY} H ${target.left} M ${b.right} ${b.centerY} H ${midX} V ${midY}`,
          hasPrediction: bothPredicted,
        });
      } else {
        const midX = (a.left + target.right) / 2;
        const midY = (a.centerY + b.centerY) / 2;
        paths.push({
          d: `M ${a.left} ${a.centerY} H ${midX} V ${midY} H ${target.right} M ${b.left} ${b.centerY} H ${midX} V ${midY}`,
          hasPrediction: bothPredicted,
        });
      }
    } else if (conn.sources.length === 1) {
      const source = getPos(conn.sources[0]);
      if (!source) continue;
      if (conn.side === 'left') {
        paths.push({
          d: `M ${source.right} ${source.centerY} H ${target.left}`,
          hasPrediction: source.hasPrediction,
        });
      } else {
        paths.push({
          d: `M ${source.left} ${source.centerY} H ${target.right}`,
          hasPrediction: source.hasPrediction,
        });
      }
    }
  }

  return paths;
}

// ─── Prediction status helper ────────────────────────────────────────
function getMatchPredictionStatus(match: ResolvedMatch): 'predicted' | 'partial' | 'empty' {
  if (match.prediction) return 'predicted';
  if (match.homeTeam && match.awayTeam) return 'empty';
  return 'partial';
}

// ─── Match card wrapper with prediction indicator ────────────────────
function BracketMatchWrapper({ 
  match, 
  children, 
  bracketPos,
  isFinal = false,
  isThirdPlace = false,
}: { 
  match: ResolvedMatch; 
  children: React.ReactNode;
  bracketPos: string;
  isFinal?: boolean;
  isThirdPlace?: boolean;
}) {
  const status = getMatchPredictionStatus(match);
  const hasPrediction = status === 'predicted';
  
  return (
    <div 
      data-bracket-pos={bracketPos}
      data-has-prediction={hasPrediction ? 'true' : 'false'}
      className={cn(
        "transition-all duration-200",
        // Prediction status left border
        status === 'predicted' && "border-l-2 border-l-success/60 rounded-l-sm",
        status === 'empty' && "border-l-2 border-l-border rounded-l-sm",
        status === 'partial' && "border-l-2 border-l-muted-foreground/30 rounded-l-sm",
        // Final emphasis
        isFinal && "ring-2 ring-primary/20 rounded-lg shadow-glow",
        // 3rd place bronze accent
        isThirdPlace && "ring-1 ring-gold/20 rounded-lg",
      )}
    >
      {children}
    </div>
  );
}

// ─── Stage header component ──────────────────────────────────────────
function StageHeader({ label, shortLabel, isFinal = false }: { label: string; shortLabel: string; isFinal?: boolean }) {
  if (isFinal) {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="gradient-brand rounded-full px-3 py-1 flex items-center gap-1.5">
          <Trophy className="h-3 w-3 text-primary-foreground" />
          <span className="text-xs font-bold text-primary-foreground tracking-wide uppercase">
            {shortLabel}
          </span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex justify-center">
      <span className={cn(
        "text-[10px] font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded-full",
        "bg-muted/80 text-muted-foreground border border-border/50"
      )}>
        {shortLabel}
      </span>
    </div>
  );
}

// ─── Mobile vertical layout ─────────────────────────────────────────
function MobileBracketView({ bracket, leagueId, onMatchClick }: FullBracketViewProps) {
  const stages = useMemo(() => [
    { key: 'round_of_32', matches: bracket.round_of_32 },
    { key: 'round_of_16', matches: bracket.round_of_16 },
    { key: 'quarter_final', matches: bracket.quarter_final },
    { key: 'semi_final', matches: bracket.semi_final },
    { key: 'third_place', matches: bracket.third_place },
    { key: 'final', matches: bracket.final },
  ].filter(s => s.matches.length > 0), [bracket]);

  const [openStages, setOpenStages] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    stages.forEach(s => { initial[s.key] = true; });
    return initial;
  });

  // Pinch-to-zoom via custom hook
  const { zoom: mobileZoom, containerRef, containerStyle, contentStyle, isZoomed, zoomIn: mobileZoomIn, zoomOut: mobileZoomOut, resetZoom } = usePinchZoom();

  const toggleStage = (key: string) => {
    setOpenStages(prev => ({ ...prev, [key]: !prev[key] }));
  };

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
  const headerLabels = ['R32', 'R16', 'QF', 'SF', 'FINAL', 'SF', 'QF', 'R16', 'R32'];

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
      const bracketWidth = 1424; // 1400 + padding
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
    <Card className="overflow-hidden relative">
      <CardContent className="p-0">
        {/* Zoom indicator */}
        {isZoomed && (
          <div className="sticky top-0 z-20 flex justify-center py-1 bg-muted/80 backdrop-blur-sm">
            <Badge variant="outline" className="text-[10px] gap-1">
              {Math.round(mobileZoom * 100)}% — {isBirdsEye ? 'Bird\'s Eye View' : 'Double-tap to reset'}
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
              {/* Stage header row */}
              <div className="grid grid-cols-9 gap-2 w-[1400px] px-3 pt-3 pb-1">
                {headerLabels.map((label, idx) => (
                  <StageHeader 
                    key={idx} 
                    label={label} 
                    shortLabel={label} 
                    isFinal={idx === 4} 
                  />
                ))}
              </div>

              {/* 9-column bracket grid */}
              <div className="grid grid-cols-9 gap-2 w-[1400px] px-3 pb-3">
                {/* Col 1 – R32 Left */}
                <div className="flex flex-col gap-1">
                  {splitMatches.r32Left.map((match, idx) => (
                    <BracketMatchWrapper key={`l-r32-${idx}`} match={match} bracketPos={`m-l-r32-${idx}`}>
                      <KnockoutMatchNode match={match} actualMatchId={match.matchId} onClick={() => onMatchClick(match)} isCompact leagueId={leagueId} />
                    </BracketMatchWrapper>
                  ))}
                </div>
                {/* Col 2 – R16 Left */}
                <div className="flex flex-col justify-around">
                  {splitMatches.r16Left.map((match, idx) => (
                    <BracketMatchWrapper key={`l-r16-${idx}`} match={match} bracketPos={`m-l-r16-${idx}`}>
                      <KnockoutMatchNode match={match} actualMatchId={match.matchId} onClick={() => onMatchClick(match)} isCompact leagueId={leagueId} />
                    </BracketMatchWrapper>
                  ))}
                </div>
                {/* Col 3 – QF Left */}
                <div className="flex flex-col justify-around">
                  {splitMatches.qfLeft.map((match, idx) => (
                    <BracketMatchWrapper key={`l-qf-${idx}`} match={match} bracketPos={`m-l-qf-${idx}`}>
                      <KnockoutMatchNode match={match} actualMatchId={match.matchId} onClick={() => onMatchClick(match)} isCompact leagueId={leagueId} />
                    </BracketMatchWrapper>
                  ))}
                </div>
                {/* Col 4 – SF Left */}
                <div className="flex flex-col justify-center">
                  {splitMatches.sfLeft.map((match, idx) => (
                    <BracketMatchWrapper key={`l-sf-${idx}`} match={match} bracketPos={`m-l-sf-${idx}`}>
                      <KnockoutMatchNode match={match} actualMatchId={match.matchId} onClick={() => onMatchClick(match)} isCompact leagueId={leagueId} />
                    </BracketMatchWrapper>
                  ))}
                </div>
                {/* Col 5 – Final + 3rd Place */}
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="text-center space-y-2 w-full">
                    {splitMatches.final.map((match, idx) => (
                      <BracketMatchWrapper key={`c-final-${idx}`} match={match} bracketPos={`m-c-final-${idx}`} isFinal>
                        <KnockoutMatchNode match={match} actualMatchId={match.matchId} onClick={() => onMatchClick(match)} leagueId={leagueId} />
                      </BracketMatchWrapper>
                    ))}
                    <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
                      <div className="h-px flex-1 bg-border" />
                      <Trophy className="h-3 w-3 text-gold" />
                      <span className="font-semibold uppercase tracking-wider text-gold">Champion</span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  </div>
                  <div className="text-center space-y-1 w-full">
                    <span className="text-[9px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">3rd</span>
                    {splitMatches.thirdPlace.map((match, idx) => (
                      <BracketMatchWrapper key={`c-3rd-${idx}`} match={match} bracketPos={`m-c-3rd-${idx}`} isThirdPlace>
                        <KnockoutMatchNode match={match} actualMatchId={match.matchId} onClick={() => onMatchClick(match)} isCompact leagueId={leagueId} />
                      </BracketMatchWrapper>
                    ))}
                  </div>
                </div>
                {/* Col 6 – SF Right */}
                <div className="flex flex-col justify-center">
                  {splitMatches.sfRight.map((match, idx) => (
                    <BracketMatchWrapper key={`r-sf-${idx}`} match={match} bracketPos={`m-r-sf-${idx}`}>
                      <KnockoutMatchNode match={match} actualMatchId={match.matchId} onClick={() => onMatchClick(match)} isCompact leagueId={leagueId} />
                    </BracketMatchWrapper>
                  ))}
                </div>
                {/* Col 7 – QF Right */}
                <div className="flex flex-col justify-around">
                  {splitMatches.qfRight.map((match, idx) => (
                    <BracketMatchWrapper key={`r-qf-${idx}`} match={match} bracketPos={`m-r-qf-${idx}`}>
                      <KnockoutMatchNode match={match} actualMatchId={match.matchId} onClick={() => onMatchClick(match)} isCompact leagueId={leagueId} />
                    </BracketMatchWrapper>
                  ))}
                </div>
                {/* Col 8 – R16 Right */}
                <div className="flex flex-col justify-around">
                  {splitMatches.r16Right.map((match, idx) => (
                    <BracketMatchWrapper key={`r-r16-${idx}`} match={match} bracketPos={`m-r-r16-${idx}`}>
                      <KnockoutMatchNode match={match} actualMatchId={match.matchId} onClick={() => onMatchClick(match)} isCompact leagueId={leagueId} />
                    </BracketMatchWrapper>
                  ))}
                </div>
                {/* Col 9 – R32 Right */}
                <div className="flex flex-col gap-1">
                  {splitMatches.r32Right.map((match, idx) => (
                    <BracketMatchWrapper key={`r-r32-${idx}`} match={match} bracketPos={`m-r-r32-${idx}`}>
                      <KnockoutMatchNode match={match} actualMatchId={match.matchId} onClick={() => onMatchClick(match)} isCompact leagueId={leagueId} />
                    </BracketMatchWrapper>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ── Normal mobile: vertical collapsible layout ── */
          <div
            ref={containerRef}
            className="relative"
            style={containerStyle}
          >
            <div style={contentStyle}>
              {stages.map((stage, stageIdx) => {
                const predicted = stage.matches.filter(m => m.prediction).length;
                const total = stage.matches.length;
                const progressPercent = total > 0 ? (predicted / total) * 100 : 0;
                const isFinal = stage.key === 'final';
                const isThirdPlace = stage.key === 'third_place';

                return (
                  <div key={stage.key} className="relative">
                    {stageIdx > 0 && (
                      <div className="flex justify-center -mt-px">
                        <div className="w-px h-3 border-l-2 border-dashed border-border" />
                      </div>
                    )}
                    
                    <Collapsible
                      open={openStages[stage.key]}
                      onOpenChange={() => toggleStage(stage.key)}
                    >
                      <div className={cn(
                        "border-l-4 mx-2 rounded-lg overflow-hidden mb-1",
                        isFinal && "border-l-primary bg-primary/5",
                        isThirdPlace && "border-l-gold/60",
                        !isFinal && !isThirdPlace && "border-l-primary/30",
                      )}>
                        <CollapsibleTrigger className="w-full">
                          <div className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-2.5">
                              {isFinal && <Trophy className="h-4 w-4 text-primary" />}
                              <h3 className="font-semibold text-sm">
                                {STAGE_LABELS[stage.key] || stage.key}
                              </h3>
                              <Badge 
                                variant={predicted === total && total > 0 ? "default" : "outline"} 
                                className={cn(
                                  "text-[10px] tabular-nums",
                                  predicted === total && total > 0 && "bg-success text-success-foreground"
                                )}
                              >
                                {predicted}/{total}
                              </Badge>
                            </div>
                            <ChevronDown className={cn(
                              "h-4 w-4 text-muted-foreground transition-transform duration-200",
                              openStages[stage.key] && "rotate-180"
                            )} />
                          </div>
                          {/* Progress bar */}
                          <div className="px-3 pb-2">
                            <Progress value={progressPercent} className="h-1" />
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="grid grid-cols-1 gap-2 px-3 pb-3">
                            {stage.matches.map((match, idx) => (
                              <KnockoutMatchNode
                                key={`${stage.key}-${idx}-${match.matchId}`}
                                match={match}
                                actualMatchId={match.matchId}
                                onClick={() => onMatchClick(match)}
                                isCompact
                                leagueId={leagueId}
                              />
                            ))}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
      
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
    </Card>
  );
}

// ─── Desktop full bracket grid ───────────────────────────────────────
export function FullBracketView({ bracket, leagueId, onMatchClick }: FullBracketViewProps) {
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);
  const bracketRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState(80); // default 80% for fit
  const [connectorPaths, setConnectorPaths] = useState<ConnectorPathInfo[]>([]);
  const [contentSize, setContentSize] = useState({ width: 0, height: 0 });

  // Split matches for left / right halves
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

  const scale = zoomLevel / 100;

  // Measure natural (unscaled) content size for sizing wrapper
  useEffect(() => {
    if (isMobile || !bracketRef.current) return;
    
    const measure = () => {
      if (!bracketRef.current) return;
      setContentSize({
        width: bracketRef.current.scrollWidth,
        height: bracketRef.current.scrollHeight,
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(bracketRef.current);
    return () => observer.disconnect();
  }, [isMobile, bracket]);

  // Fit-to-screen calculation using measured content width
  const fitToScreen = useCallback(() => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth;
    const bracketNaturalWidth = contentSize.width || 1700;
    const optimalZoom = Math.floor((containerWidth / bracketNaturalWidth) * 100);
    setZoomLevel(Math.max(40, Math.min(150, optimalZoom)));
  }, [contentSize.width]);

  // Auto-fit on mount & resize
  useEffect(() => {
    if (isMobile) return;
    fitToScreen();
    const handleResize = () => fitToScreen();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [fitToScreen, isMobile]);

  // Compute SVG connector paths after layout settles
  useEffect(() => {
    if (isMobile || !bracketRef.current) return;

    const compute = () => {
      if (!bracketRef.current) return;
      setConnectorPaths(computeConnectorPaths(bracketRef.current, scale));
    };

    const timer = setTimeout(compute, 150);
    const observer = new ResizeObserver(compute);
    if (bracketRef.current) observer.observe(bracketRef.current);
    return () => { clearTimeout(timer); observer.disconnect(); };
  }, [bracket, scale, isMobile, contentSize]);

  const zoomIn = () => setZoomLevel(prev => Math.min(150, prev + 10));
  const zoomOut = () => setZoomLevel(prev => Math.max(40, prev - 10));

  // ── Mobile layout ──
  if (isMobile) {
    return <MobileBracketView bracket={bracket} leagueId={leagueId} onMatchClick={onMatchClick} />;
  }

  // Column header labels
  const headerLabels = ['R32', 'R16', 'QF', 'SF', 'FINAL', 'SF', 'QF', 'R16', 'R32'];

  // Calculate scaled dimensions for sizing wrapper
  const scaledWidth = contentSize.width ? contentSize.width * scale : 1700 * scale;
  const scaledHeight = contentSize.height ? contentSize.height * scale : undefined;

  // ── Desktop / tablet grid ──
  return (
    <Card className="overflow-hidden border-border/50 bg-gradient-to-b from-card via-card to-muted/20 relative">
      <CardContent className="p-0">
        <div 
          ref={containerRef} 
          className="overflow-auto"
          style={{ maxHeight: 'calc(100vh - 180px)' }}
        >
          {/* Sizing wrapper: defines the actual scrollable area */}
          <div
            style={{
              width: scaledWidth,
              height: scaledHeight,
              position: 'relative',
            }}
          >
            {/* Transformed inner: applies the scale transform */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
              }}
            >
              <div ref={bracketRef} className="relative inline-block">
                {/* SVG connector overlay */}
                <svg
                  className="absolute inset-0 pointer-events-none z-0"
                  style={{ width: '100%', height: '100%', overflow: 'visible' }}
                >
                  <defs>
                    <linearGradient id="connectorPredicted" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.7" />
                    </linearGradient>
                  </defs>
                  {connectorPaths.map((path, idx) => (
                    <path
                      key={idx}
                      d={path.d}
                      stroke={path.hasPrediction ? 'url(#connectorPredicted)' : 'hsl(var(--border))'}
                      strokeWidth={path.hasPrediction ? 2 : 1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                      opacity={path.hasPrediction ? 1 : 0.5}
                      strokeDasharray={path.hasPrediction ? 'none' : '4 3'}
                    />
                  ))}
                </svg>

                {/* Stage header row */}
                <div className="grid grid-cols-9 gap-4 min-w-[1700px] px-4 pt-4 pb-2 relative z-10">
                  {headerLabels.map((label, idx) => (
                    <StageHeader 
                      key={idx} 
                      label={label} 
                      shortLabel={label} 
                      isFinal={idx === 4} 
                    />
                  ))}
                </div>

                {/* 9-column bracket grid */}
                <div className="grid grid-cols-9 gap-4 min-w-[1700px] px-4 pb-4 relative z-10">
                  {/* Col 1 – R32 Left */}
                  <div className="flex flex-col gap-1">
                    {splitMatches.r32Left.map((match, idx) => (
                      <BracketMatchWrapper key={`l-r32-${idx}`} match={match} bracketPos={`l-r32-${idx}`}>
                        <KnockoutMatchNode
                          match={match}
                          actualMatchId={match.matchId}
                          onClick={() => onMatchClick(match)}
                          isCompact
                          leagueId={leagueId}
                        />
                      </BracketMatchWrapper>
                    ))}
                  </div>

                  {/* Col 2 – R16 Left */}
                  <div className="flex flex-col justify-around">
                    {splitMatches.r16Left.map((match, idx) => (
                      <BracketMatchWrapper key={`l-r16-${idx}`} match={match} bracketPos={`l-r16-${idx}`}>
                        <KnockoutMatchNode
                          match={match}
                          actualMatchId={match.matchId}
                          onClick={() => onMatchClick(match)}
                          isCompact
                          leagueId={leagueId}
                        />
                      </BracketMatchWrapper>
                    ))}
                  </div>

                  {/* Col 3 – QF Left */}
                  <div className="flex flex-col justify-around">
                    {splitMatches.qfLeft.map((match, idx) => (
                      <BracketMatchWrapper key={`l-qf-${idx}`} match={match} bracketPos={`l-qf-${idx}`}>
                        <KnockoutMatchNode
                          match={match}
                          actualMatchId={match.matchId}
                          onClick={() => onMatchClick(match)}
                          isCompact
                          leagueId={leagueId}
                        />
                      </BracketMatchWrapper>
                    ))}
                  </div>

                  {/* Col 4 – SF Left */}
                  <div className="flex flex-col justify-center">
                    {splitMatches.sfLeft.map((match, idx) => (
                      <BracketMatchWrapper key={`l-sf-${idx}`} match={match} bracketPos={`l-sf-${idx}`}>
                        <KnockoutMatchNode
                          match={match}
                          actualMatchId={match.matchId}
                          onClick={() => onMatchClick(match)}
                          isCompact
                          leagueId={leagueId}
                        />
                      </BracketMatchWrapper>
                    ))}
                  </div>

                  {/* Col 5 – Final + 3rd Place */}
                  <div className="flex flex-col items-center justify-center gap-6">
                    <div className="text-center space-y-3 w-full">
                      {splitMatches.final.map((match, idx) => (
                        <BracketMatchWrapper 
                          key={`c-final-${idx}`} 
                          match={match} 
                          bracketPos={`c-final-${idx}`}
                          isFinal
                        >
                          <KnockoutMatchNode
                            match={match}
                            actualMatchId={match.matchId}
                            onClick={() => onMatchClick(match)}
                            leagueId={leagueId}
                          />
                        </BracketMatchWrapper>
                      ))}
                      {/* Champion label */}
                      <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
                        <div className="h-px flex-1 bg-border" />
                        <Trophy className="h-3 w-3 text-gold" />
                        <span className="font-semibold uppercase tracking-wider text-gold">Champion</span>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                    </div>
                    
                    <div className="text-center space-y-2 w-full">
                      <div className="flex justify-center">
                        <span className="text-[10px] font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">
                          3rd Place
                        </span>
                      </div>
                      {splitMatches.thirdPlace.map((match, idx) => (
                        <BracketMatchWrapper 
                          key={`c-3rd-${idx}`} 
                          match={match} 
                          bracketPos={`c-3rd-${idx}`}
                          isThirdPlace
                        >
                          <KnockoutMatchNode
                            match={match}
                            actualMatchId={match.matchId}
                            onClick={() => onMatchClick(match)}
                            isCompact
                            leagueId={leagueId}
                          />
                        </BracketMatchWrapper>
                      ))}
                    </div>
                  </div>

                  {/* Col 6 – SF Right */}
                  <div className="flex flex-col justify-center">
                    {splitMatches.sfRight.map((match, idx) => (
                      <BracketMatchWrapper key={`r-sf-${idx}`} match={match} bracketPos={`r-sf-${idx}`}>
                        <KnockoutMatchNode
                          match={match}
                          actualMatchId={match.matchId}
                          onClick={() => onMatchClick(match)}
                          isCompact
                          leagueId={leagueId}
                        />
                      </BracketMatchWrapper>
                    ))}
                  </div>

                  {/* Col 7 – QF Right */}
                  <div className="flex flex-col justify-around">
                    {splitMatches.qfRight.map((match, idx) => (
                      <BracketMatchWrapper key={`r-qf-${idx}`} match={match} bracketPos={`r-qf-${idx}`}>
                        <KnockoutMatchNode
                          match={match}
                          actualMatchId={match.matchId}
                          onClick={() => onMatchClick(match)}
                          isCompact
                          leagueId={leagueId}
                        />
                      </BracketMatchWrapper>
                    ))}
                  </div>

                  {/* Col 8 – R16 Right */}
                  <div className="flex flex-col justify-around">
                    {splitMatches.r16Right.map((match, idx) => (
                      <BracketMatchWrapper key={`r-r16-${idx}`} match={match} bracketPos={`r-r16-${idx}`}>
                        <KnockoutMatchNode
                          match={match}
                          actualMatchId={match.matchId}
                          onClick={() => onMatchClick(match)}
                          isCompact
                          leagueId={leagueId}
                        />
                      </BracketMatchWrapper>
                    ))}
                  </div>

                  {/* Col 9 – R32 Right */}
                  <div className="flex flex-col gap-1">
                    {splitMatches.r32Right.map((match, idx) => (
                      <BracketMatchWrapper key={`r-r32-${idx}`} match={match} bracketPos={`r-r32-${idx}`}>
                        <KnockoutMatchNode
                          match={match}
                          actualMatchId={match.matchId}
                          onClick={() => onMatchClick(match)}
                          isCompact
                          leagueId={leagueId}
                        />
                      </BracketMatchWrapper>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      
      {/* Floating zoom controls - absolute overlay on Card */}
      <div className="absolute bottom-4 right-4 pointer-events-none z-20">
        <div className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-full bg-background/95 backdrop-blur-md border border-border/50 shadow-lg hover:shadow-glow transition-shadow duration-300">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-primary/10"
            onClick={zoomOut}
            disabled={zoomLevel <= 40}
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs font-semibold w-10 text-center font-mono tabular-nums text-muted-foreground">
            {zoomLevel}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-primary/10"
            onClick={zoomIn}
            disabled={zoomLevel >= 150}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <div className="w-px h-5 bg-border/60 mx-0.5" />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-primary/10"
            onClick={fitToScreen}
            title="Fit to Screen"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
