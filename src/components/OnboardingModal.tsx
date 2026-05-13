import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { 
  Trophy, 
  Users, 
  Target, 
  Rocket, 
  ChevronLeft, 
  ChevronRight,
  Coins,
  Award,
  Zap,
  Plus,
  UserPlus,
  Compass,
  Clock,
  BarChart3,
  Home,
  BookOpen,
  MessageCircle,
  HelpCircle,
} from 'lucide-react';
import goalpickLogo from '@/assets/goalpick-logo-v2.png';

interface OnboardingModalProps {
  open: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

const TOTAL_STEPS = 5;
const SWIPE_THRESHOLD = 50;

export function OnboardingModal({ open, onComplete, onSkip }: OnboardingModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [dontShowAgain, setDontShowAgain] = useState(true);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayStep, setDisplayStep] = useState(1);

  // Sync displayStep after animation
  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => {
      setDisplayStep(currentStep);
      setIsAnimating(false);
    }, 10);
    return () => clearTimeout(timer);
  }, [currentStep]);

  // Swipe handling
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = null;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > SWIPE_THRESHOLD) {
      if (diff > 0 && currentStep < TOTAL_STEPS) {
        setSlideDirection('left');
        setCurrentStep(prev => prev + 1);
      } else if (diff < 0 && currentStep > 1) {
        setSlideDirection('right');
        setCurrentStep(prev => prev - 1);
      }
    }
    touchStartX.current = null;
    touchEndX.current = null;
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setSlideDirection('left');
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setSlideDirection('right');
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleStepClick = (step: number) => {
    setSlideDirection(step > currentStep ? 'left' : 'right');
    setCurrentStep(step);
  };

  const handleCreateLeague = () => {
    onComplete();
    navigate('/leagues/create');
  };

  const handleJoinLeague = () => {
    onComplete();
    navigate('/leagues');
  };

  const handleMockPick = () => {
    onComplete();
    navigate('/solo-bracket');
  };

  const progress = (currentStep / TOTAL_STEPS) * 100;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0 [&>button]:hidden">
        {/* Progress Bar */}
        <div className="px-6 pt-6">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between mt-2">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <button
                key={i}
                onClick={() => handleStepClick(i + 1)}
                className={cn(
                  "w-8 h-8 rounded-full text-xs font-medium transition-all",
                  currentStep === i + 1
                    ? "bg-primary text-primary-foreground"
                    : currentStep > i + 1
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Content — swipeable */}
        <div
          className="px-6 py-8 min-h-[400px] flex flex-col touch-pan-y overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            key={currentStep}
            className={cn(
              "flex-1 flex flex-col transition-all duration-300 ease-out",
              isAnimating
                ? slideDirection === 'left'
                  ? "translate-x-8 opacity-0"
                  : "-translate-x-8 opacity-0"
                : "translate-x-0 opacity-100"
            )}
          >
            {displayStep === 1 && <WelcomeStep />}
            {displayStep === 2 && <LeaguesStep />}
            {displayStep === 3 && <PredictionsStep />}
            {displayStep === 4 && <ScoringStep />}
            {displayStep === 5 && (
              <GetStartedStep
                onCreateLeague={handleCreateLeague}
                onJoinLeague={handleJoinLeague}
                onMockPick={handleMockPick}
                dontShowAgain={dontShowAgain}
                setDontShowAgain={setDontShowAgain}
              />
            )}
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="px-6 pb-6 flex items-center justify-between border-t pt-4">
          <Button
            variant="ghost"
            onClick={onSkip}
            className="text-muted-foreground"
          >
            {t('onboarding.skipTutorial')}
          </Button>
          
          <div className="flex gap-2">
            {currentStep > 1 && (
              <Button variant="outline" onClick={handleBack} size="sm">
                <ChevronLeft className="h-4 w-4 mr-1" />
                {t('common.back')}
              </Button>
            )}
            <Button onClick={handleNext} size="sm">
              {currentStep === TOTAL_STEPS ? t('onboarding.getStarted') : t('common.next')}
              {currentStep < TOTAL_STEPS && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Step 1: Welcome ────────────────────────────────────────
function WelcomeStep() {
  const { t } = useTranslation();
  
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-gold/30 to-primary/20 rounded-full blur-2xl" />
        <img 
          src={goalpickLogo} 
          alt="GOALPICK" 
          className="h-24 w-auto relative z-10"
        />
      </div>
      
      <div className="space-y-3">
        <h2 className="text-3xl font-display text-gradient-brand">
          {t('onboarding.welcome')}
        </h2>
        <p className="text-muted-foreground max-w-sm text-sm">
          {t('onboarding.welcomeDesc')}
        </p>
      </div>
      
      <div className="flex items-center gap-4 pt-4">
        <div className="flex flex-col items-center gap-1">
          <div className="p-3 rounded-full bg-primary/10">
            <Target className="h-6 w-6 text-primary" />
          </div>
          <span className="text-xs text-muted-foreground">{t('onboarding.predict')}</span>
        </div>
        <Zap className="h-4 w-4 text-muted-foreground" />
        <div className="flex flex-col items-center gap-1">
          <div className="p-3 rounded-full bg-accent/10">
            <Users className="h-6 w-6 text-accent" />
          </div>
          <span className="text-xs text-muted-foreground">{t('onboarding.compete')}</span>
        </div>
        <Zap className="h-4 w-4 text-muted-foreground" />
        <div className="flex flex-col items-center gap-1">
          <div className="p-3 rounded-full bg-gold/10">
            <Trophy className="h-6 w-6 text-gold" />
          </div>
          <span className="text-xs text-muted-foreground">{t('onboarding.win')}</span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground/70 italic pt-2">
        {t('onboarding.swipeHint')}
      </p>
    </div>
  );
}

// ─── Step 2: Leagues ────────────────────────────────────────
function LeaguesStep() {
  const { t } = useTranslation();
  
  return (
    <div className="flex-1 flex flex-col space-y-5">
      <div className="text-center space-y-2">
        <div className="mx-auto w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center">
          <Users className="h-7 w-7 text-accent" />
        </div>
        <h2 className="text-2xl font-display">{t('onboarding.leaguesTitle')}</h2>
        <p className="text-muted-foreground text-sm">
          {t('onboarding.leaguesDesc')}
        </p>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
          <div className="p-2 rounded bg-background shrink-0">
            <Plus className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h4 className="font-medium text-sm">{t('onboarding.createLeagueTitle')}</h4>
            <p className="text-xs text-muted-foreground">
              {t('onboarding.createLeagueDesc')}
            </p>
          </div>
        </div>
        
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
          <div className="p-2 rounded bg-background shrink-0">
            <UserPlus className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h4 className="font-medium text-sm">{t('onboarding.joinLeagueTitle')}</h4>
            <p className="text-xs text-muted-foreground">
              {t('onboarding.joinLeagueDesc')}
            </p>
          </div>
        </div>
        
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
          <div className="p-2 rounded bg-background shrink-0">
            <Coins className="h-5 w-5 text-gold" />
          </div>
          <div>
            <h4 className="font-medium text-sm">{t('onboarding.entryFeesPrizes')}</h4>
            <p className="text-xs text-muted-foreground">
              {t('onboarding.entryFeesPrizesDesc')}
            </p>
          </div>
        </div>

        <p className="text-xs text-center text-muted-foreground/80 italic pt-1">
          {t('onboarding.multipleLeaguesNote')}
        </p>
      </div>
    </div>
  );
}

// ─── Step 3: How Predictions Work ───────────────────────────
function PredictionsStep() {
  const { t } = useTranslation();
  
  return (
    <div className="flex-1 flex flex-col space-y-5">
      <div className="text-center space-y-2">
        <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Target className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-2xl font-display">{t('onboarding.predictionsTitle')}</h2>
        <p className="text-muted-foreground text-sm">
          {t('onboarding.predictionsDesc')}
        </p>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/15">
          <div className="p-2 rounded bg-primary/10 shrink-0">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h4 className="font-medium text-sm">{t('onboarding.phaseByPhaseTitle')}</h4>
            <p className="text-xs text-muted-foreground">
              {t('onboarding.phaseByPhaseExplain')}
            </p>
          </div>
        </div>
        
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
          <div className="p-2 rounded bg-background shrink-0">
            <Clock className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h4 className="font-medium text-sm">{t('onboarding.lockingTitle')}</h4>
            <p className="text-xs text-muted-foreground">
              {t('onboarding.lockingDesc')}
            </p>
          </div>
        </div>
        
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
          <div className="p-2 rounded bg-background shrink-0">
            <Target className="h-5 w-5 text-gold" />
          </div>
          <div>
            <h4 className="font-medium text-sm">{t('onboarding.scoreFormatTitle')}</h4>
            <p className="text-xs text-muted-foreground">
              {t('onboarding.scoreFormatDesc')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 4: Scoring (generic) ──────────────────────────────
function ScoringStep() {
  const { t } = useTranslation();
  
  return (
    <div className="flex-1 flex flex-col space-y-5">
      <div className="text-center space-y-2">
        <div className="mx-auto w-14 h-14 rounded-full bg-gold/10 flex items-center justify-center">
          <Award className="h-7 w-7 text-gold" />
        </div>
        <h2 className="text-2xl font-display">{t('onboarding.scoringTitle')}</h2>
        <p className="text-muted-foreground text-sm">
          {t('onboarding.scoringDesc')}
        </p>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/15">
          <span className="text-xl">🎯</span>
          <div className="flex-1">
            <p className="font-medium text-sm">{t('onboarding.exactScoreLabel')}</p>
            <p className="text-xs text-muted-foreground">{t('onboarding.exactScoreHint')}</p>
          </div>
          <span className="text-sm font-bold text-primary">{t('onboarding.mostPoints')}</span>
        </div>
        
        <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/5 border border-accent/15">
          <span className="text-xl">✓</span>
          <div className="flex-1">
            <p className="font-medium text-sm">{t('onboarding.correctOutcomeLabel')}</p>
            <p className="text-xs text-muted-foreground">{t('onboarding.correctOutcomeHint')}</p>
          </div>
          <span className="text-sm font-bold text-accent">{t('onboarding.somePoints')}</span>
        </div>
        
        <div className="flex items-center gap-3 p-3 rounded-lg bg-gold/5 border border-gold/15">
          <span className="text-xl">🏆</span>
          <div className="flex-1">
            <p className="font-medium text-sm">{t('onboarding.multipliersLabel')}</p>
            <p className="text-xs text-muted-foreground">{t('onboarding.multipliersHint')}</p>
          </div>
        </div>
      </div>

      <p className="text-xs text-center text-muted-foreground/80 italic">
        {t('onboarding.scoringCustomNote')}
      </p>
    </div>
  );
}

// ─── Step 5: Get Started (3 paths + app sections) ──────────
interface GetStartedStepProps {
  onCreateLeague: () => void;
  onJoinLeague: () => void;
  onMockPick: () => void;
  dontShowAgain: boolean;
  setDontShowAgain: (value: boolean) => void;
}

function GetStartedStep({ 
  onCreateLeague,
  onJoinLeague, 
  onMockPick,
  dontShowAgain,
  setDontShowAgain
}: GetStartedStepProps) {
  const { t } = useTranslation();
  
  return (
    <div className="flex-1 flex flex-col items-center text-center space-y-5">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/20 rounded-full blur-2xl" />
        <div className="relative z-10 p-5 rounded-full bg-gradient-to-br from-primary/20 to-accent/10">
          <Rocket className="h-10 w-10 text-primary" />
        </div>
      </div>
      
      <div className="space-y-1">
        <h2 className="text-2xl font-display">{t('onboarding.readyToStart')}</h2>
        <p className="text-muted-foreground text-sm max-w-xs">
          {t('onboarding.readyDesc')}
        </p>
      </div>
      
      {/* 3 Dynamic Paths */}
      <div className="flex flex-col gap-2.5 w-full max-w-sm">
        <Button onClick={onCreateLeague} className="gap-2 w-full">
          <Plus className="h-4 w-4" />
          {t('onboarding.pathCreate')}
        </Button>
        <Button onClick={onJoinLeague} variant="outline" className="gap-2 w-full">
          <UserPlus className="h-4 w-4" />
          {t('onboarding.pathJoin')}
        </Button>
        <Button onClick={onMockPick} variant="ghost" className="gap-2 w-full">
          <Compass className="h-4 w-4" />
          {t('onboarding.pathMockPick')}
        </Button>
      </div>

      {/* Quick app sections reference */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-1">
        {[
          { icon: Home, label: t('onboarding.sectionHome') },
          { icon: Target, label: t('onboarding.sectionGoalpicks') },
          { icon: BarChart3, label: t('onboarding.sectionStandings') },
          { icon: BookOpen, label: t('onboarding.sectionRules') },
          { icon: MessageCircle, label: t('onboarding.sectionChat') },
          { icon: HelpCircle, label: t('onboarding.sectionHelp') },
        ].map(({ icon: Icon, label }) => (
          <span key={label} className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Icon className="h-3 w-3" /> {label}
          </span>
        ))}
      </div>
      
      <div className="flex items-center gap-2 pt-2">
        <Checkbox 
          id="dontShow"
          checked={dontShowAgain}
          onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
        />
        <label htmlFor="dontShow" className="text-sm text-muted-foreground cursor-pointer">
          {t('onboarding.dontShowAgain')}
        </label>
      </div>
    </div>
  );
}
