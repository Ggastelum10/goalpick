import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Match } from '@/hooks/useMatches';
import { Prediction } from '@/hooks/usePredictions';
import { buildKnockoutBracket, KnockoutBracketData, ResolvedMatch } from '@/lib/knockoutBracketResolver';
import { BracketMatchCard } from './BracketMatchCard';
import { BracketControls, BracketViewType } from './BracketControls';
import { BirdsEyeKnockoutBracket } from './BirdsEyeKnockoutBracket';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface ReadOnlyKnockoutOverviewProps {
  matches: Match[];
  predictions: Prediction[];
  confirmedStandings?: Record<string, string[]>;
  tiebreakOverrides?: Record<string, string[]>;
}

const stageLabels: Record<string, string> = {
  round_of_32: 'R32',
  round_of_16: 'R16',
  quarter_final: 'QF',
  semi_final: 'SF',
  third_place: '3rd',
  final: 'Final',
};

const stageOrder = ['round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final'];

function StageSection({ 
  stage, 
  matches, 
  showScores,
}: { 
  stage: string; 
  matches: ResolvedMatch[];
  showScores: boolean;
}) {
  const { t } = useTranslation();
  
  const predictedCount = matches.filter(m => m.prediction !== null).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {t(`knockoutView.${stage === 'round_of_32' ? 'roundOf32' : 
            stage === 'round_of_16' ? 'roundOf16' : 
            stage === 'quarter_final' ? 'quarterFinals' : 
            stage === 'semi_final' ? 'semiFinals' : 
            stage === 'third_place' ? 'thirdPlace' : 'final'}`)}
        </h3>
        <Badge 
          variant={predictedCount === matches.length ? 'default' : 'secondary'}
          className={cn(
            'text-[10px] px-1.5',
            predictedCount === matches.length && 'bg-success text-success-foreground'
          )}
        >
          {predictedCount}/{matches.length}
        </Badge>
      </div>
      
      <div className={cn(
        'grid gap-3',
        stage === 'final' || stage === 'third_place' 
          ? 'grid-cols-1 sm:grid-cols-2' 
          : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8'
      )}>
        {matches.map((match, idx) => (
          <BracketMatchCard 
            key={match.matchId} 
            match={match} 
            showScores={showScores}
            compact={matches.length > 4}
            showMetadata
            animationDelay={idx * 50}
          />
        ))}
      </div>
    </div>
  );
}

export function ReadOnlyKnockoutOverview({ 
  matches, 
  predictions,
  confirmedStandings,
  tiebreakOverrides
}: ReadOnlyKnockoutOverviewProps) {
  const { t } = useTranslation();
  const [viewType, setViewType] = useState<BracketViewType>('full');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showScores, setShowScores] = useState(true);
  const [selectedStage, setSelectedStage] = useState('round_of_32');

  const bracket = useMemo(() => 
    buildKnockoutBracket(matches, predictions, confirmedStandings, tiebreakOverrides),
    [matches, predictions, confirmedStandings, tiebreakOverrides]
  );

  const knockoutMatches = matches.filter(m => m.stage !== 'group');
  
  if (knockoutMatches.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t('matchesOverview.noKnockoutMatches')}
      </div>
    );
  }

  // Calculate total predictions
  const totalPredictions = stageOrder.reduce((acc, stage) => {
    return acc + (bracket[stage as keyof KnockoutBracketData] as ResolvedMatch[])?.filter(m => m.prediction).length || 0;
  }, 0);
  const totalMatches = stageOrder.reduce((acc, stage) => {
    return acc + ((bracket[stage as keyof KnockoutBracketData] as ResolvedMatch[])?.length || 0);
  }, 0);

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <BracketControls
        viewType={viewType}
        onViewTypeChange={setViewType}
        zoomLevel={zoomLevel}
        onZoomChange={setZoomLevel}
        showScores={showScores}
        onShowScoresChange={setShowScores}
        totalPredicted={totalPredictions}
        totalMatches={totalMatches}
      />

      {/* Bracket View */}
      {viewType === 'full' ? (
        <BirdsEyeKnockoutBracket
          bracket={bracket}
          showScores={showScores}
          zoomLevel={zoomLevel}
        />
      ) : (
        <Tabs value={selectedStage} onValueChange={setSelectedStage}>
          <TabsList className="w-full justify-start overflow-x-auto">
            {stageOrder.map((stage) => {
              const stageMatches = bracket[stage as keyof KnockoutBracketData] as ResolvedMatch[];
              if (!stageMatches || stageMatches.length === 0) return null;
              
              return (
                <TabsTrigger key={stage} value={stage} className="text-xs">
                  {stageLabels[stage]}
                </TabsTrigger>
              );
            })}
          </TabsList>
          
          {stageOrder.map((stage) => {
            const stageMatches = bracket[stage as keyof KnockoutBracketData] as ResolvedMatch[];
            if (!stageMatches || stageMatches.length === 0) return null;
            
            return (
              <TabsContent key={stage} value={stage} className="mt-4">
                <StageSection 
                  stage={stage} 
                  matches={stageMatches}
                  showScores={showScores}
                />
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
}
