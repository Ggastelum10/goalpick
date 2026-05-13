import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-LEAGUE-PAYMENT] ${step}${detailsStr}`);
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

    const { league_id } = await req.json();
    if (!league_id) throw new Error("league_id is required");
    logStep("Request payload", { league_id });

    // Fetch league details
    const { data: league, error: leagueError } = await supabaseClient
      .from("leagues")
      .select("*")
      .eq("id", league_id)
      .single();

    if (leagueError || !league) {
      throw new Error("League not found");
    }
    logStep("League found", { 
      leagueName: league.name, 
      entryFee: league.entry_fee,
      prepaidLicenses: league.prepaid_licenses,
      ownerCoversFees: league.owner_covers_fees,
      platformFeesWaived: league.platform_fees_waived
    });

    // Check if user is already a paid member
    const { data: existingMember } = await supabaseClient
      .from("league_members")
      .select("*")
      .eq("league_id", league_id)
      .eq("user_id", user.id)
      .single();

    if (existingMember?.has_paid) {
      throw new Error("User has already paid for this league");
    }
    logStep("User membership check passed");

    // Admin-set league-wide waiver: skip Stripe entirely and add the user as paid.
    if (league.platform_fees_waived) {
      logStep("Platform fees waived for this league - bypassing Stripe");

      if (existingMember) {
        await supabaseClient
          .from("league_members")
          .update({ has_paid: true, admin_fee_paid: true })
          .eq("league_id", league_id)
          .eq("user_id", user.id);
      } else {
        await supabaseClient
          .from("league_members")
          .insert({
            league_id: league_id,
            user_id: user.id,
            has_paid: true,
            admin_fee_paid: true,
          });
      }

      logStep("User added via league-wide waiver");

      return new Response(
        JSON.stringify({
          success: true,
          waived: true,
          message: "Joined league - platform fees waived",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    // Check if prepaid licenses are available
    const prepaidLicenses = league.prepaid_licenses ?? 0;
    if (prepaidLicenses > 0) {
      logStep("Using prepaid license", { availableLicenses: prepaidLicenses });
      
      // Decrement prepaid licenses
      const { error: decrementError } = await supabaseClient
        .from("leagues")
        .update({ prepaid_licenses: prepaidLicenses - 1 })
        .eq("id", league_id);
      
      if (decrementError) {
        logStep("Error decrementing licenses", { error: decrementError.message });
        throw new Error("Failed to use prepaid license");
      }
      
      // Mark user as paid member
      if (existingMember) {
        await supabaseClient
          .from("league_members")
          .update({ has_paid: true, admin_fee_paid: true })
          .eq("league_id", league_id)
          .eq("user_id", user.id);
      } else {
        await supabaseClient
          .from("league_members")
          .insert({
            league_id: league_id,
            user_id: user.id,
            has_paid: true,
            admin_fee_paid: true,
          });
      }
      
      logStep("User added with prepaid license");
      
      // Return success without Stripe redirect
      return new Response(JSON.stringify({ 
        success: true, 
        prepaid: true,
        message: "Joined league using prepaid license" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    // No prepaid licenses - proceed with Stripe checkout
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

    // Convert entry fee to cents (Stripe expects amounts in smallest currency unit)
    const amountInCents = Math.round(Number(league.entry_fee) * 100);

    const origin = req.headers.get("origin") || "https://your-domain.com";
    
    // Exchange rates for currency conversion
    const exchangeRates: Record<string, number> = {
      'usd': 1,
      'mxn': 20,    // 1 USD = ~20 MXN
      'eur': 0.92,  // 1 USD = ~0.92 EUR
      'gbp': 0.79,  // 1 USD = ~0.79 GBP
      'cad': 1.36,  // 1 USD = ~1.36 CAD
    };
    
    const leagueCurrency = league.currency.toLowerCase();
    
    // Validate supported currencies
    const supportedCurrencies = ['usd', 'mxn', 'eur', 'gbp', 'cad'];
    if (!supportedCurrencies.includes(leagueCurrency)) {
      throw new Error(`Currency ${leagueCurrency} is not supported. Supported: ${supportedCurrencies.join(', ')}`);
    }
    logStep("Currency validated", { leagueCurrency });
    
    // Convert platform fee from its configured currency to league currency
    const platformFeeInConfiguredCurrency = platformFeeBase;
    const configuredCurrencyToUsd = 1 / (exchangeRates[platformFeeCurrency] || 1);
    const platformFeeInUsd = platformFeeInConfiguredCurrency * configuredCurrencyToUsd;
    const platformFeeInLeagueCurrency = platformFeeInUsd * (exchangeRates[leagueCurrency] || 1);
    const platformFeeInCents = Math.round(platformFeeInLeagueCurrency * 100);
    logStep("Platform fee calculated", { 
      platformFeeBase, 
      platformFeeCurrency, 
      leagueCurrency, 
      platformFeeInCents 
    });

    // Enforce Stripe minimum amounts (auto-adjust if below minimum)
    const minimumAmounts: Record<string, number> = {
      'usd': 50,
      'mxn': 1000,
      'eur': 50,
      'gbp': 30,
      'cad': 50,
    };
    const minAmount = minimumAmounts[leagueCurrency] || 50;
    const finalFeeInCents = Math.max(platformFeeInCents, minAmount);
    logStep("Final fee after minimum enforcement", { 
      originalFee: platformFeeInCents, 
      minAmount, 
      finalFee: finalFeeInCents 
    });

    logStep("Creating checkout session", {
      customerId: customerId || 'new customer',
      userEmail: user.email,
      leagueCurrency,
      platformFeeInCents,
      origin
    });

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: leagueCurrency,
            product_data: {
              name: 'GOALPICK App Access Fee',
              description: `Access fee to join ${league.name} league on GOALPICK`,
            },
            unit_amount: finalFeeInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/leagues/${league_id}?payment=success`,
      cancel_url: `${origin}/leagues/${league_id}?payment=cancelled`,
      metadata: {
        league_id: league_id,
        user_id: user.id,
        platform_fee: 'true',
      },
    });

    logStep("Checkout session created successfully", { 
      sessionId: session.id, 
      url: session.url,
      paymentMethods: ['card']
    });

    

    // Insert or update league membership (unpaid)
    if (!existingMember) {
      const { error: insertError } = await supabaseClient
        .from("league_members")
        .insert({
          league_id: league_id,
          user_id: user.id,
          has_paid: false,
        });

      if (insertError) {
        logStep("Error creating membership", { error: insertError.message });
      } else {
        logStep("Membership created (unpaid)");
      }
    }

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
