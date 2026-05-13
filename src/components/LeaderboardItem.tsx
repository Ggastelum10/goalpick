import { Trophy, ArrowUp, ArrowDown, Minus, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { SparkChart } from '@/components/SparkChart';
import { LeaderboardEntry } from '@/hooks/useLeaderboard';
import { useAuth } from '@/hooks/useAuth';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface LeaderboardItemProps {
  entry: LeaderboardEntry;
  showRankChange?: boolean;
  showSparkChart?: boolean;
}

export function LeaderboardItem({ 
  entry, 
  showRankChange = true,
  showSparkChart = false 
}: LeaderboardItemProps) {
  const { user } = useAuth();
  const isCurrentUser = user?.id === entry.user_id;
  const rankChange = entry.previousRank ? entry.previousRank - (entry.rank ?? 0) : 0;

  // Mock streak and chart data - in real app would come from backend
  const streak = Math.floor(Math.random() * 5);
  const chartData = [10, 15, 12, 18, 22, 20, 25];

  const getRankDisplay = () => {
    if (entry.rank === 1) {
      return (
        <div className="relative">
          <span className="text-2xl">🥇</span>
          <div className="absolute inset-0 animate-pulse-ring opacity-50" />
        </div>
      );
    }
    if (entry.rank === 2) {
      return <span className="text-2xl">🥈</span>;
    }
    if (entry.rank === 3) {
      return <span className="text-2xl">🥉</span>;
    }
    return (
      <span className="text-lg font-display text-muted-foreground w-8 text-center">
        {entry.rank}
      </span>
    );
  };

  const getPodiumClass = () => {
    if (entry.rank === 1) return 'podium-gold bg-gradient-to-r from-gold/10 to-transparent';
    if (entry.rank === 2) return 'podium-silver bg-gradient-to-r from-slate-200/20 to-transparent';
    if (entry.rank === 3) return 'podium-bronze bg-gradient-to-r from-orange-400/10 to-transparent';
    return '';
  };

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 md:gap-2 lg:gap-3 px-2 py-2 md:px-3 md:py-2.5 lg:px-4 lg:py-3 rounded-lg transition-all duration-300',
        'hover:bg-muted/50 group',
        isCurrentUser && 'bg-primary/10 ring-1 ring-primary/30',
        getPodiumClass()
      )}
    >
      {/* Rank */}
      <div className="flex items-center justify-center w-8 md:w-10">{getRankDisplay()}</div>

      {/* Rank change indicator */}
      {showRankChange && (
        <div className="w-6 flex justify-center">
          {rankChange > 0 && (
            <div className="flex items-center text-success animate-rank-up">
              <ArrowUp className="h-4 w-4" />
              <span className="text-xs font-medium">{rankChange}</span>
            </div>
          )}
          {rankChange < 0 && (
            <div className="flex items-center text-destructive animate-rank-down">
              <ArrowDown className="h-4 w-4" />
              <span className="text-xs font-medium">{Math.abs(rankChange)}</span>
            </div>
          )}
          {rankChange === 0 && (
            <div className="flex items-center text-muted-foreground">
              <Minus className="h-4 w-4" />
            </div>
          )}
        </div>
      )}

      {/* Avatar */}
      <Avatar className="h-8 w-8 md:h-10 md:w-10 ring-2 ring-background shadow-md group-hover:ring-primary/20 transition-all">
        <AvatarImage src={entry.avatar_url || undefined} />
        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
          {entry.display_name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* Name, team, and stats */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <p className={cn(
                'font-medium truncate cursor-default',
                isCurrentUser && 'text-primary'
              )}>
                {entry.display_name}
              </p>
            </TooltipTrigger>
            <TooltipContent>
              <p>{entry.display_name}</p>
            </TooltipContent>
          </Tooltip>
          {isCurrentUser && (
            <Badge variant="secondary" className="text-[10px] shrink-0">
              You
            </Badge>
          )}
          {streak >= 3 && (
            <div className="flex items-center gap-0.5 text-accent animate-pulse shrink-0">
              <Flame className="h-3 w-3" />
              <span className="text-[10px] font-bold">{streak}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {entry.favorite_team && (
            <span className="truncate">{entry.favorite_team}</span>
          )}
        </div>
      </div>

      {/* Tiebreaker Stats - visible on larger screens */}
      <div className="hidden xl:flex items-center gap-3 text-xs text-muted-foreground">
        <div className="text-center" title="Exact score predictions">
          <span className="font-semibold text-primary">{entry.exact_score_count || 0}</span>
          <span className="ml-0.5">🎯</span>
        </div>
        <div className="text-center" title="Correct outcomes">
          <span className="font-semibold text-accent">{entry.correct_outcome_count || 0}</span>
          <span className="ml-0.5">✓</span>
        </div>
        <div className="text-center" title="Goal difference accuracy">
          <span className="font-semibold text-muted-foreground">{entry.goal_difference_accuracy || 0}</span>
          <span className="ml-0.5">±</span>
        </div>
      </div>

      {/* Spark chart */}
      {showSparkChart && (
        <div className="hidden sm:block">
          <SparkChart data={chartData} color="primary" />
        </div>
      )}

      {/* Points */}
      <div className="text-right">
        <div className="flex items-center gap-1">
          <Trophy className="h-4 w-4 text-gold" />
          <span className="font-display text-lg md:text-xl">{entry.total_points}</span>
        </div>
        <p className="text-[10px] text-muted-foreground">points</p>
      </div>

      {/* Paid status */}
      <div className="hidden xl:block">
        {entry.has_paid_entry ? (
          <Badge className="bg-success/20 text-success border-0 text-[10px]">Paid</Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground text-[10px]">Pending</Badge>
        )}
      </div>
    </div>
  );
}
