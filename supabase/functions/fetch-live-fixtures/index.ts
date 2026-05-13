import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin check
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiToken = Deno.env.get("SPORTMONKS_API_TOKEN");
    if (!apiToken) {
      return new Response(JSON.stringify({ error: "SPORTMONKS_API_TOKEN not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body for mode
    let mode = "inplay";
    let dateParam = "";
    try {
      const body = await req.json();
      if (body.mode) mode = body.mode;
      if (body.date) dateParam = body.date;
    } catch {
      // No body or invalid JSON — use defaults
    }

    let url: string;
    if (mode === "date") {
      // Default to today in YYYY-MM-DD format
      const targetDate = dateParam || new Date().toISOString().split("T")[0];
      url = `https://api.sportmonks.com/v3/football/fixtures/date/${targetDate}?api_token=${apiToken}&include=participants;scores;league&per_page=150`;
    } else {
      url = `https://api.sportmonks.com/v3/football/livescores/inplay?api_token=${apiToken}&include=participants;scores;league`;
    }

    const response = await fetch(url);
    const raw = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: raw.message || "SportMonks API error",
        status: response.status 
      }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fixtures = (raw.data || []).map((fix: any) => {
      const participants = fix.participants || [];
      const home = participants.find((p: any) => p.meta?.location === "home");
      const away = participants.find((p: any) => p.meta?.location === "away");

      const scores = fix.scores || [];
      const homeGoals = home?.meta?.goals ?? scores.find((s: any) => s.description === "CURRENT" && s.score?.participant === "home")?.score?.goals ?? 0;
      const awayGoals = away?.meta?.goals ?? scores.find((s: any) => s.description === "CURRENT" && s.score?.participant === "away")?.score?.goals ?? 0;

      return {
        external_id: String(fix.id),
        home_team: home?.name || "Home",
        away_team: away?.name || "Away",
        home_score: homeGoals,
        away_score: awayGoals,
        league_name: fix.league?.name || "Unknown League",
        league_id: fix.league?.id,
        minute: fix.minute || null,
        state: fix.state?.short_name || fix.state_id,
        starting_at: fix.starting_at,
      };
    });

    return new Response(JSON.stringify({ 
      success: true, 
      fixtures,
      count: fixtures.length,
      mode,
      fetched_at: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
