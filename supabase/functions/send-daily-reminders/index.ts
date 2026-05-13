import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DAILY-REMINDERS] ${step}${detailsStr}`);
};

const BATCH_SIZE = 20; // Concurrent email sends per batch
const START_TIME = Date.now();
const TIMEOUT_BUFFER_MS = 50000; // Stop processing 10s before 60s timeout

function isApproachingTimeout(): boolean {
  return Date.now() - START_TIME > TIMEOUT_BUFFER_MS;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting daily reminder job");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get matches in the next 24 hours
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const { data: upcomingMatches, error: matchesError } = await supabase
      .from('matches')
      .select('*')
      .gte('match_date', now.toISOString())
      .lte('match_date', in24Hours.toISOString())
      .eq('status', 'scheduled')
      .order('match_date', { ascending: true });

    if (matchesError) throw matchesError;

    if (!upcomingMatches || upcomingMatches.length === 0) {
      logStep("No matches in next 24 hours");
      return new Response(
        JSON.stringify({ success: true, message: "No matches to remind about" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    logStep("Found upcoming matches", { count: upcomingMatches.length });

    // Get all league members with their user info
    const { data: leagueMembers, error: membersError } = await supabase
      .from('league_members')
      .select('user_id, league_id');

    if (membersError) throw membersError;

    // Get unique user IDs
    const uniqueUserIds = [...new Set(leagueMembers?.map(m => m.user_id) || [])];
    logStep("Found league members", { count: uniqueUserIds.length });

    if (uniqueUserIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No league members to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get profiles for all users (paginated)
    const allProfiles: Array<{ user_id: string; display_name: string }> = [];
    const profilePageSize = 1000;
    for (let i = 0; i < uniqueUserIds.length; i += profilePageSize) {
      const batch = uniqueUserIds.slice(i, i + profilePageSize);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', batch);
      if (profilesError) throw profilesError;
      if (profiles) allProfiles.push(...profiles);
    }

    // Get user emails from auth.users (paginated — max 1000 per call)
    const userEmailMap = new Map<string, string>();
    let page = 1;
    const perPage = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers({
        page,
        perPage,
      });

      if (authError) {
        logStep("Error fetching auth users", { error: authError.message, page });
        break;
      }

      authUsers.users.forEach(u => {
        userEmailMap.set(u.id, u.email || '');
      });

      hasMore = authUsers.users.length === perPage;
      page++;
    }

    const profileMap = new Map(
      allProfiles.map(p => [p.user_id, p.display_name])
    );

    // Format matches for email
    const formattedMatches = upcomingMatches.map(match => ({
      homeTeam: match.home_team,
      awayTeam: match.away_team,
      matchDate: new Date(match.match_date).toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short'
      }),
      stage: match.stage
    }));

    // Send emails in parallel batches
    const dashboardUrl = "https://cup-corner-clash.lovable.app/matches";
    let successCount = 0;
    let errorCount = 0;
    let skippedTimeout = 0;

    for (let i = 0; i < uniqueUserIds.length; i += BATCH_SIZE) {
      if (isApproachingTimeout()) {
        skippedTimeout = uniqueUserIds.length - i;
        logStep("Approaching timeout, stopping", { remaining: skippedTimeout });
        break;
      }

      const batch = uniqueUserIds.slice(i, i + BATCH_SIZE);
      const promises = batch.map(async (userId) => {
        const email = userEmailMap.get(userId);
        const displayName = profileMap.get(userId) || 'Predictor';

        if (!email) return;

        try {
          const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              type: 'daily-reminder',
              to: email,
              data: {
                displayName,
                matches: formattedMatches,
                dashboardUrl
              }
            })
          });

          if (emailResponse.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch {
          errorCount++;
        }
      });

      await Promise.all(promises);
    }

    logStep("Daily reminders complete", { successCount, errorCount, skippedTimeout });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${successCount} reminders, ${errorCount} failed${skippedTimeout > 0 ? `, ${skippedTimeout} skipped (timeout)` : ''}`,
        matchCount: upcomingMatches.length
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
