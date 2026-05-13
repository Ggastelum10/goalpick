import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SPORTMONKS_API_TOKEN = Deno.env.get("SPORTMONKS_API_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// FIFA World Cup 2026 League ID in Sportmonks
const WORLD_CUP_LEAGUE_ID = 732;

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SYNC-MATCHES] ${step}${detailsStr}`);
};

// Map Sportmonks state IDs to our status enum
function mapStateToStatus(stateId: number): string {
  // Scheduled states
  if ([1, 2, 13, 15].includes(stateId)) return "scheduled";
  // Live states
  if ([3, 4, 21, 22, 24, 25, 26].includes(stateId)) return "live";
  // Finished states
  if ([5, 6, 11].includes(stateId)) return "finished";
  // Postponed/cancelled states
  if ([7, 9, 10, 14, 17].includes(stateId)) return "postponed";
  return "scheduled";
}

// Map stage names to our tournament_stage enum
function mapStage(stageName: string): string {
  const name = stageName.toLowerCase();
  if (name.includes("group")) return "group";
  if (name.includes("32") || name.includes("thirty-two")) return "round_of_32";
  if (name.includes("16") || name.includes("sixteen")) return "round_of_16";
  if (name.includes("quarter")) return "quarter_final";
  if (name.includes("semi")) return "semi_final";
  if (name.includes("3rd") || name.includes("third")) return "third_place";
  if (name.includes("final")) return "final";
  return "group";
}

// Extract group name from stage (e.g., "Group A" -> "A")
function extractGroupName(stageName: string): string | null {
  const match = stageName.match(/Group\s+([A-Z])/i);
  return match ? match[1].toUpperCase() : null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Authentication check - require valid admin user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing or invalid authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      logStep("Authentication failed", { error: claimsError?.message });
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = claimsData.claims.sub;
    logStep("User authenticated", { userId });

    // Admin role check using service role client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { data: adminRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !adminRole) {
      logStep("Admin check failed", { userId, hasRole: !!adminRole });
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    logStep("Admin verified");

    // Parse request body for dryRun flag
    let dryRun = false;
    try {
      const body = await req.json();
      dryRun = body?.dryRun === true;
    } catch {
      // No body or invalid JSON — proceed normally
    }

    if (!SPORTMONKS_API_TOKEN) {
      throw new Error("SPORTMONKS_API_TOKEN is not configured");
    }

    logStep(`Starting Sportmonks sync (dryRun: ${dryRun})...`);

    // First, get the season ID for World Cup 2026
    const leagueResponse = await fetch(
      `https://api.sportmonks.com/v3/football/leagues/${WORLD_CUP_LEAGUE_ID}?include=currentSeason;seasons&api_token=${SPORTMONKS_API_TOKEN}`
    );

    if (!leagueResponse.ok) {
      const errorText = await leagueResponse.text();
      logStep("League API error", { error: errorText });
      throw new Error(`Failed to fetch league data: ${leagueResponse.status}`);
    }

    const leagueData = await leagueResponse.json();
    logStep("League data received");

    // Find the 2026 season or use current season
    let seasonId = leagueData.data?.current_season_id;
    
    if (leagueData.data?.seasons) {
      const season2026 = leagueData.data.seasons.find(
        (s: any) => s.name?.includes("2026") || s.name?.includes("25/26")
      );
      if (season2026) {
        seasonId = season2026.id;
      }
    }

    if (!seasonId) {
      logStep("No season found, trying to use latest available season");
      // Try to get the latest season from the seasons array
      if (leagueData.data?.seasons?.length > 0) {
        seasonId = leagueData.data.seasons[leagueData.data.seasons.length - 1].id;
      }
    }

    logStep(`Using season ID: ${seasonId}`);

    if (!seasonId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "World Cup 2026 season not yet available in Sportmonks",
          availableSeasons: leagueData.data?.seasons || [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch fixtures for the season
    const fixturesResponse = await fetch(
      `https://api.sportmonks.com/v3/football/fixtures?filter=seasonIds:${seasonId}&include=participants;scores;venue;stage;round&per_page=150&api_token=${SPORTMONKS_API_TOKEN}`
    );

    if (!fixturesResponse.ok) {
      const errorText = await fixturesResponse.text();
      logStep("Fixtures API error", { error: errorText });
      throw new Error(`Failed to fetch fixtures: ${fixturesResponse.status}`);
    }

    const fixturesData = await fixturesResponse.json();
    logStep(`Found ${fixturesData.data?.length || 0} fixtures`);

    if (!fixturesData.data || fixturesData.data.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No fixtures available yet for this season",
          synced: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process and upsert fixtures
    const matches = fixturesData.data.map((fixture: any) => {
      const homeTeam = fixture.participants?.find((p: any) => p.meta?.location === "home");
      const awayTeam = fixture.participants?.find((p: any) => p.meta?.location === "away");
      
      // Get scores
      let homeScore = null;
      let awayScore = null;
      if (fixture.scores) {
        const homeScoreData = fixture.scores.find(
          (s: any) => s.description === "CURRENT" && s.score?.participant === "home"
        );
        const awayScoreData = fixture.scores.find(
          (s: any) => s.description === "CURRENT" && s.score?.participant === "away"
        );
        homeScore = homeScoreData?.score?.goals ?? null;
        awayScore = awayScoreData?.score?.goals ?? null;
      }

      const stageName = fixture.stage?.name || fixture.round?.name || "Group Stage";

      return {
        external_id: String(fixture.id),
        home_team: homeTeam?.name || "TBD",
        away_team: awayTeam?.name || "TBD",
        home_team_flag: homeTeam?.image_path || null,
        away_team_flag: awayTeam?.image_path || null,
        match_date: fixture.starting_at,
        venue: fixture.venue?.name || null,
        city: fixture.venue?.city_name || null,
        stage: mapStage(stageName),
        group_name: extractGroupName(stageName),
        home_score: homeScore,
        away_score: awayScore,
        status: mapStateToStatus(fixture.state_id),
      };
    });

    // Dry-run: return diagnostics without writing to DB
    if (dryRun) {
      const statusCounts: Record<string, number> = {};
      const stageCounts: Record<string, number> = {};
      matches.forEach((m: any) => {
        statusCounts[m.status] = (statusCounts[m.status] || 0) + 1;
        stageCounts[m.stage] = (stageCounts[m.stage] || 0) + 1;
      });

      return new Response(
        JSON.stringify({
          success: true,
          dryRun: true,
          message: `Found ${matches.length} fixtures (not written to DB)`,
          fixtureCount: matches.length,
          seasonId,
          statusBreakdown: statusCounts,
          stageBreakdown: stageCounts,
          sampleFixtures: matches.slice(0, 5),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep(`Upserting ${matches.length} matches...`);

    // Upsert matches using external_id as the unique key
    const { data, error } = await supabase
      .from("matches")
      .upsert(matches, { onConflict: "external_id", ignoreDuplicates: false })
      .select();

    if (error) {
      logStep("Supabase upsert error", { error: error.message });
      throw error;
    }

    logStep(`Successfully synced ${data?.length || 0} matches`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully synced ${data?.length || 0} matches`,
        synced: data?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
