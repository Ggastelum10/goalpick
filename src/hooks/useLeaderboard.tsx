import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useRef, useCallback } from 'react';

export interface LeaderboardEntry {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  favorite_team: string | null;
  total_points: number;
  has_paid_entry: boolean;
  rank?: number;
  previousRank?: number;
  // Tiebreaker stats
  exact_score_count: number;
  correct_outcome_count: number;
  goal_difference_accuracy: number;
}

const PAGE_SIZE = 50;

function applyRanking(entries: LeaderboardEntry[], offset: number = 0): LeaderboardEntry[] {
  let currentRank = offset + 1;

  return entries.map((entry, index) => {
    if (index > 0) {
      const prev = entries[index - 1];
      const isTied =
        entry.total_points === prev.total_points &&
        entry.exact_score_count === prev.exact_score_count &&
        entry.correct_outcome_count === prev.correct_outcome_count &&
        entry.goal_difference_accuracy === prev.goal_difference_accuracy;

      if (!isTied) {
        currentRank = offset + index + 1;
      }
    }

    return { ...entry, rank: currentRank };
  });
}

export function useLeaderboard(page: number = 0) {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const query = useQuery({
    queryKey: ['leaderboard', page],
    queryFn: async () => {
      // Get total count
      const { count, error: countError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('total_points', { ascending: false })
        .order('exact_score_count', { ascending: false })
        .order('correct_outcome_count', { ascending: false })
        .order('goal_difference_accuracy', { ascending: false })
        .range(from, to);

      if (error) throw error;

      const entries = applyRanking(data as LeaderboardEntry[], from);
      return { entries, totalCount: count || 0, pageSize: PAGE_SIZE };
    },
  });

  // Debounced realtime subscription — refetch at most once every 10 seconds
  const refetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRefetchRef = useRef(false);

  const debouncedRefetch = useCallback(() => {
    if (refetchTimeoutRef.current) {
      pendingRefetchRef.current = true;
      return;
    }
    query.refetch();
    refetchTimeoutRef.current = setTimeout(() => {
      refetchTimeoutRef.current = null;
      if (pendingRefetchRef.current) {
        pendingRefetchRef.current = false;
        query.refetch();
      }
    }, 10000);
  }, [query]);

  useEffect(() => {
    const channel = supabase
      .channel('leaderboard-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => debouncedRefetch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (refetchTimeoutRef.current) clearTimeout(refetchTimeoutRef.current);
    };
  }, [debouncedRefetch]);

  return query;
}

// Lightweight hook for Dashboard top N — no realtime, no pagination overhead
export function useTopLeaderboard(limit: number = 5) {
  return useQuery({
    queryKey: ['leaderboard-top', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('total_points', { ascending: false })
        .order('exact_score_count', { ascending: false })
        .order('correct_outcome_count', { ascending: false })
        .order('goal_difference_accuracy', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return applyRanking(data as LeaderboardEntry[]);
    },
  });
}

// Lightweight hook for current user's rank
export function useUserRank(userId: string) {
  return useQuery({
    queryKey: ['user-rank', userId],
    queryFn: async () => {
      if (!userId) return null;

      // Count how many users have more points (or better tiebreakers)
      // This is a rough rank — for exact rank we'd need a DB function
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .or(`total_points.gt.0,total_points.eq.0`); // just get total count

      if (error) return null;

      // Get user's own profile
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('total_points, exact_score_count, correct_outcome_count, goal_difference_accuracy')
        .eq('user_id', userId)
        .single();

      if (profileError || !userProfile) return null;

      // Count users ranked above this user
      const { count: aboveCount, error: aboveError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gt('total_points', userProfile.total_points || 0);

      if (aboveError) return null;

      return (aboveCount || 0) + 1;
    },
    enabled: !!userId,
  });
}
