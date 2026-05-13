import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DAILY-SUMMARY] ${step}${detailsStr}`);
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Daily summary function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get matches that finished today (last 24 hours)
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    const { data: finishedMatches, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'finished')
      .gte('updated_at', yesterday.toISOString())
      .order('match_date', { ascending: true });

    if (matchError) {
      throw new Error(`Error fetching matches: ${matchError.message}`);
    }

    logStep("Finished matches found", { count: finishedMatches?.length || 0 });

    if (!finishedMatches || finishedMatches.length === 0) {
      return new Response(
        JSON.stringify({ message: "No finished matches today" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const matchIds = finishedMatches.map(m => m.id);

    // Get all users with email notifications enabled
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, display_name, total_points, notify_email_enabled, notify_match_results, notify_points_change, notify_standings_update, exact_score_count, correct_outcome_count, goal_difference_accuracy')
      .eq('notify_email_enabled', true);

    if (profileError) {
      throw new Error(`Error fetching profiles: ${profileError.message}`);
    }

    logStep("Profiles to notify", { count: profiles?.length || 0 });

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ message: "No users with email notifications enabled" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get user emails from auth
    const userIds = profiles.map(p => p.user_id);
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      throw new Error(`Error fetching auth users: ${authError.message}`);
    }

    // Create email map
    const userEmailMap = new Map<string, string>();
    authUsers.users.forEach(u => {
      if (u.email && userIds.includes(u.id)) {
        userEmailMap.set(u.id, u.email);
      }
    });

    // Get predictions for finished matches for all users
    const { data: predictions, error: predError } = await supabase
      .from('predictions')
      .select('*')
      .in('match_id', matchIds)
      .in('user_id', userIds);

    if (predError) {
      throw new Error(`Error fetching predictions: ${predError.message}`);
    }

    // Calculate rankings
    const sortedProfiles = [...profiles].sort((a, b) => {
      if (b.total_points !== a.total_points) return b.total_points - a.total_points;
      if ((b.exact_score_count || 0) !== (a.exact_score_count || 0)) return (b.exact_score_count || 0) - (a.exact_score_count || 0);
      if ((b.correct_outcome_count || 0) !== (a.correct_outcome_count || 0)) return (b.correct_outcome_count || 0) - (a.correct_outcome_count || 0);
      return (b.goal_difference_accuracy || 0) - (a.goal_difference_accuracy || 0);
    });

    const rankMap = new Map<string, number>();
    sortedProfiles.forEach((p, idx) => rankMap.set(p.user_id, idx + 1));

    let emailsSent = 0;
    const dashboardUrl = "https://cup-corner-clash.lovable.app";

    // Process each user
    for (const profile of profiles) {
      const email = userEmailMap.get(profile.user_id);
      if (!email) continue;

      // Check if user wants any notifications
      if (!profile.notify_match_results && !profile.notify_points_change && !profile.notify_standings_update) {
        continue;
      }

      // Get this user's predictions for today's matches
      const userPredictions = predictions?.filter(p => p.user_id === profile.user_id) || [];
      
      // Calculate match results for this user
      const matchResults = finishedMatches.map(match => {
        const pred = userPredictions.find(p => p.match_id === match.id);
        const wasExact = pred && 
          pred.predicted_home_score === match.home_score && 
          pred.predicted_away_score === match.away_score;
        
        return {
          homeTeam: match.home_team,
          awayTeam: match.away_team,
          homeScore: match.home_score || 0,
          awayScore: match.away_score || 0,
          pointsEarned: pred?.points_earned || 0,
          wasExact: wasExact || false,
        };
      });

      const totalPointsToday = matchResults.reduce((sum, m) => sum + m.pointsEarned, 0);
      const currentRank = rankMap.get(profile.user_id) || 0;

      // Send email via send-email function
      try {
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            type: 'daily-summary',
            to: email,
            data: {
              displayName: profile.display_name,
              matchResults,
              totalPointsToday,
              totalPoints: profile.total_points || 0,
              currentRank,
              rankChange: 0, // Would need historical data to calculate
              dashboardUrl,
            },
          }),
        });

        if (emailResponse.ok) {
          emailsSent++;
          logStep("Email sent", { userId: profile.user_id, email });

          // Log notification
          await supabase.from('notification_logs').insert({
            user_id: profile.user_id,
            notification_type: 'daily_summary',
            channel: 'email',
            payload: { matchCount: matchResults.length, pointsToday: totalPointsToday },
          });
        } else {
          const errData = await emailResponse.json();
          logStep("Email send failed", { userId: profile.user_id, error: errData });
        }
      } catch (emailErr: any) {
        logStep("Email error", { userId: profile.user_id, error: emailErr.message });
      }
    }

    logStep("Daily summary complete", { emailsSent });

    return new Response(
      JSON.stringify({ success: true, emailsSent }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
