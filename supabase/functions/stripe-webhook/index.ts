import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Helper function to send emails
const sendEmail = async (type: string, to: string, data: Record<string, any>) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    
    const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ type, to, data }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      logStep("Email send failed", { type, error });
    } else {
      logStep("Email sent successfully", { type, to });
    }
  } catch (error) {
    logStep("Email send error", { type, error: error instanceof Error ? error.message : String(error) });
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Use service role key for webhook to bypass RLS
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      throw new Error("No stripe-signature header provided");
    }

    // Verify webhook signature for security
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    logStep("Event parsed", { type: event.type });

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Get payment method details
      const paymentMethodType = session.payment_method_types?.[0] || 'unknown';
      
      logStep("Checkout session completed", { 
        sessionId: session.id, 
        metadata: session.metadata,
        paymentMethod: paymentMethodType,
        amountTotal: session.amount_total,
        currency: session.currency
      });

      const { league_id, user_id, platform_fee, bulk_licenses, license_count } = session.metadata || {};

      // Handle bulk license purchases
      if (bulk_licenses === 'true' && league_id && license_count) {
        const count = parseInt(license_count, 10);
        logStep("Processing bulk license purchase", { league_id, license_count: count });
        
        // Update the league's prepaid_licenses count
        const { data: currentLeague } = await supabaseClient
          .from("leagues")
          .select("prepaid_licenses")
          .eq("id", league_id)
          .single();
        
        const currentLicenses = currentLeague?.prepaid_licenses ?? 0;
        const newLicenseCount = currentLicenses + count;
        
        const { error: updateError } = await supabaseClient
          .from("leagues")
          .update({ 
            prepaid_licenses: newLicenseCount,
            owner_covers_fees: true 
          })
          .eq("id", league_id);
        
        if (updateError) {
          logStep("Error updating prepaid licenses", { error: updateError.message });
        } else {
          logStep("Prepaid licenses updated", { league_id, newLicenseCount });
        }
        
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      if (!league_id || !user_id) {
        logStep("Missing metadata, skipping");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Create a payment reference that includes method info
      const paymentId = session.payment_intent as string;

      // Fetch user and league details for emails
      const [profileResult, leagueResult] = await Promise.all([
        supabaseClient
          .from("profiles")
          .select("display_name, user_id")
          .eq("user_id", user_id)
          .single(),
        supabaseClient
          .from("leagues")
          .select("name, entry_fee, currency")
          .eq("id", league_id)
          .single()
      ]);

      const userEmail = session.customer_email || session.customer_details?.email;
      const displayName = profileResult.data?.display_name || "Player";
      const leagueName = leagueResult.data?.name || "League";
      const entryFee = leagueResult.data?.entry_fee || 0;
      const currency = leagueResult.data?.currency || session.currency || "USD";

      // Update league member as paid (including admin fee)
      const { error: updateError } = await supabaseClient
        .from("league_members")
        .update({
          has_paid: true,
          admin_fee_paid: platform_fee === 'true',
          stripe_payment_id: paymentId,
        })
        .eq("league_id", league_id)
        .eq("user_id", user_id);

      if (updateError) {
        logStep("Error updating membership", { error: updateError.message });
        // Try to insert if update failed (member might not exist yet)
        const { error: insertError } = await supabaseClient
          .from("league_members")
          .insert({
            league_id,
            user_id,
            has_paid: true,
            admin_fee_paid: platform_fee === 'true',
            stripe_payment_id: paymentId,
          });

        if (insertError) {
          logStep("Error inserting membership", { error: insertError.message });
        } else {
          logStep("Membership created and marked as paid", { paymentMethod: paymentMethodType });
        }
      } else {
        logStep("Membership updated - payment confirmed", { 
          league_id, 
          user_id, 
          paymentMethod: paymentMethodType 
        });
      }

      // Record the admin fee in admin_fees table
      if (platform_fee === 'true') {
        // Fetch actual platform fee settings from database
        const { data: poolSettings } = await supabaseClient
          .from("pool_settings")
          .select("platform_fee_amount, platform_fee_currency")
          .limit(1)
          .single();

        const actualAmount = poolSettings?.platform_fee_amount ?? 1.00;
        const actualCurrency = poolSettings?.platform_fee_currency ?? 'USD';

        const { error: adminFeeError } = await supabaseClient
          .from("admin_fees")
          .insert({
            user_id,
            league_id,
            amount: actualAmount,
            currency: actualCurrency,
            stripe_payment_id: paymentId,
            stripe_session_id: session.id,
            paid_at: new Date().toISOString(),
          });

        if (adminFeeError) {
          logStep("Error recording admin fee", { error: adminFeeError.message });
        } else {
          logStep("Admin fee recorded", { user_id, league_id, amount: actualAmount, currency: actualCurrency });
        }
      }

      // Send confirmation emails if we have the user's email
      if (userEmail) {
        const origin = "https://cup-corner-clash.lovable.app";
        
        // Calculate total amount paid (entry fee + platform fee if applicable)
        const totalAmount = (session.amount_total || 0) / 100;
        
        // Send payment confirmation email
        await sendEmail('payment', userEmail, {
          displayName,
          leagueName,
          amount: totalAmount,
          currency: currency.toUpperCase(),
          dashboardUrl: `${origin}/dashboard`
        });
        
        // Send league joined confirmation email
        await sendEmail('league-joined', userEmail, {
          displayName,
          leagueName,
          leagueUrl: `${origin}/leagues/${league_id}`
        });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
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
