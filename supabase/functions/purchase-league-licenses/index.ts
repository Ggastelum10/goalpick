import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PURCHASE-LEAGUE-LICENSES] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { league_id, license_count } = await req.json();
    if (!league_id) throw new Error("league_id is required");
    if (!license_count || license_count < 1) throw new Error("license_count must be at least 1");
    logStep("Request payload", { league_id, license_count });

    // Fetch league details and verify ownership
    const { data: league, error: leagueError } = await supabaseClient
      .from("leagues")
      .select("*")
      .eq("id", league_id)
      .single();

    if (leagueError || !league) {
      throw new Error("League not found");
    }
    
    if (league.owner_id !== user.id) {
      throw new Error("Only the league owner can purchase licenses");
    }
    logStep("League found and ownership verified", { leagueName: league.name });

    // Fetch platform fee settings from pool_settings
    const { data: poolSettings } = await supabaseClient
      .from("pool_settings")
      .select("platform_fee_amount, platform_fee_currency")
      .limit(1)
      .single();

    const platformFeeBase = poolSettings?.platform_fee_amount ?? 1;
    const platformFeeCurrency = (poolSettings?.platform_fee_currency ?? 'USD').toLowerCase();
    logStep("Platform fee settings", { platformFeeBase, platformFeeCurrency });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if Stripe customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing Stripe customer found", { customerId });
    }

    // Calculate total amount in cents
    const totalAmount = license_count * platformFeeBase;
    const amountInCents = Math.round(totalAmount * 100);

    // Enforce Stripe minimum amounts
    const minimumAmounts: Record<string, number> = {
      'usd': 50,
      'mxn': 1000,
      'eur': 50,
      'gbp': 30,
      'cad': 50,
    };
    const minAmount = minimumAmounts[platformFeeCurrency] || 50;
    const finalAmountInCents = Math.max(amountInCents, minAmount);
    
    logStep("Amount calculated", { 
      licenseCount: license_count, 
      platformFeeBase, 
      totalAmount, 
      amountInCents,
      finalAmountInCents 
    });

    const origin = req.headers.get("origin") || "https://cup-corner-clash.lovable.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: platformFeeCurrency,
            product_data: {
              name: 'GOALPICK League Licenses',
              description: `${license_count} prepaid app access licenses for ${league.name}`,
            },
            unit_amount: Math.round((platformFeeBase * 100)),
          },
          quantity: license_count,
        },
      ],
      mode: "payment",
      success_url: `${origin}/leagues/${league_id}?licenses=success`,
      cancel_url: `${origin}/leagues/${league_id}?licenses=cancelled`,
      metadata: {
        league_id: league_id,
        user_id: user.id,
        bulk_licenses: 'true',
        license_count: String(license_count),
      },
    });

    logStep("Checkout session created successfully", { 
      sessionId: session.id, 
      url: session.url 
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
