import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ZoomIn, ZoomOut, Maximize2, Eye, EyeOff, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type BracketViewType = 'full' | 'stages';

interface BracketControlsProps {
  viewType: BracketViewType;
  onViewTypeChange: (type: BracketViewType) => void;
  zoomLevel: number;
  onZoomChange: (level: number) => void;
  showScores: boolean;
  onShowScoresChange: (show: boolean) => void;
  totalPredicted: number;
  totalMatches: number;
  className?: string;
}

export const BracketControls = memo(function BracketControls({
  viewType,
  onViewTypeChange,
  zoomLevel,
  onZoomChange,
  showScores,
  onShowScoresChange,
  totalPredicted,
  totalMatches,
  className,
}: BracketControlsProps) {
  const { t } = useTranslation();

  const zoomLevels = [50, 75, 100, 125];
  const minZoom = zoomLevels[0];
  const maxZoom = zoomLevels[zoomLevels.length - 1];

  const handleZoomOut = () => {
    const currentIndex = zoomLevels.indexOf(zoomLevel);
    if (currentIndex > 0) {
      onZoomChange(zoomLevels[currentIndex - 1]);
    }
  };

  const handleZoomIn = () => {
    const currentIndex = zoomLevels.indexOf(zoomLevel);
    if (currentIndex < zoomLevels.length - 1) {
      onZoomChange(zoomLevels[currentIndex + 1]);
    }
  };

  const handleFitToScreen = () => {
    onZoomChange(100);
  };

  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-3', className)}>
      {/* Left side: Title and progress */}
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">{t('matchesOverview.knockoutBracket')}</h2>
        <Badge
          variant={totalPredicted === totalMatches ? 'default' : 'secondary'}
          className={cn(
            'text-xs',
            totalPredicted === totalMatches && 'bg-success text-success-foreground'
          )}
        >
          {totalPredicted}/{totalMatches} {t('matchesOverview.predicted')}
        </Badge>
      </div>

      {/* Right side: Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
          <Button
            variant={viewType === 'full' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => onViewTypeChange('full')}
          >
            {t('knockoutView.viewFullBracket')}
          </Button>
          <Button
            variant={viewType === 'stages' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => onViewTypeChange('stages')}
          >
            {t('knockoutView.viewByStage')}
          </Button>
        </div>

        {/* Show/Hide Scores Toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
              {showScores ? (
                <>
                  <Eye className="h-3 w-3" />
                  {t('knockoutView.showScores')}
                </>
              ) : (
                <>
                  <EyeOff className="h-3 w-3" />
                  {t('knockoutView.hideScores')}
                </>
              )}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onShowScoresChange(true)}>
              <Eye className="h-4 w-4 mr-2" />
              {t('knockoutView.showScores')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onShowScoresChange(false)}>
              <EyeOff className="h-4 w-4 mr-2" />
              {t('knockoutView.hideScores')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Zoom Controls - Hidden on mobile */}
        <div className="hidden sm:flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleZoomOut}
            disabled={zoomLevel <= minZoom}
            title={t('knockoutView.zoomOut')}
          >
            <ZoomOut className="h-3 w-3" />
          </Button>
          <span className="text-xs w-10 text-center font-medium">{zoomLevel}%</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleZoomIn}
            disabled={zoomLevel >= maxZoom}
            title={t('knockoutView.zoomIn')}
          >
            <ZoomIn className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleFitToScreen}
            title={t('knockoutView.fitToScreen')}
          >
            <Maximize2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
});

export default BracketControls;
