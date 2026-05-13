import { useState } from 'react';
import { useLeagueLeaderboard } from '@/hooks/useLeagues';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Trophy, Medal, Award, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MemberBracketModal } from './MemberBracketModal';

interface LeagueLeaderboardProps {
  league: {
    id: string;
    entry_fee: number;
    currency: string;
    first_place_percentage: number;
    second_place_percentage: number;
    third_place_percentage: number;
  };
}

export function LeagueLeaderboard({ league }: LeagueLeaderboardProps) {
  const { data: leaderboard, isLoading } = useLeagueLeaderboard(league.id);
  const [viewingMember, setViewingMember] = useState<{ id: string; name: string } | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            League Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!leaderboard || leaderboard.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            League Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No members yet. Be the first to join!
          </p>
        </CardContent>
      </Card>
    );
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-gold" />;
      case 2:
        return <Medal className="h-5 w-5 text-muted-foreground" />;
      case 3:
        return <Award className="h-5 w-5 text-accent" />;
      default:
        return <span className="text-muted-foreground font-medium w-5 text-center">{rank}</span>;
    }
  };

  const getPrizeAmount = (rank: number) => {
    const totalPool = league.entry_fee * leaderboard.length;
    switch (rank) {
      case 1:
        return (totalPool * league.first_place_percentage) / 100;
      case 2:
        return (totalPool * league.second_place_percentage) / 100;
      case 3:
        return (totalPool * league.third_place_percentage) / 100;
      default:
        return 0;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            League Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {leaderboard.map((entry) => (
              <div
                key={entry.user_id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg transition-colors',
                  entry.rank === 1 && 'bg-gold/10 border border-gold/30',
                  entry.rank === 2 && 'bg-muted/50 border border-muted',
                  entry.rank === 3 && 'bg-accent/10 border border-accent/30',
                  entry.rank > 3 && 'bg-muted/50'
                )}
              >
                <div className="w-8 flex justify-center">
                  {getRankIcon(entry.rank)}
                </div>
                
                <Avatar className="h-10 w-10">
                  <AvatarImage src={entry.avatar_url || undefined} />
                  <AvatarFallback>
                    {entry.display_name?.charAt(0).toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{entry.display_name}</p>
                  {entry.favorite_team && (
                    <p className="text-xs text-muted-foreground">{entry.favorite_team}</p>
                  )}
                </div>

                {/* View Bracket Button */}
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => setViewingMember({ id: entry.user_id, name: entry.display_name })}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                
                <div className="text-right">
                  <p className="font-bold">{entry.total_points} pts</p>
                  {entry.rank <= 3 && (
                    <p className="text-xs text-success">
                      +{getPrizeAmount(entry.rank).toLocaleString()} {league.currency}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Member Bracket Modal */}
      {viewingMember && (
        <MemberBracketModal
          memberId={viewingMember.id}
          memberName={viewingMember.name}
          leagueId={league.id}
          open={!!viewingMember}
          onOpenChange={(open) => !open && setViewingMember(null)}
        />
      )}
    </>
  );
}
