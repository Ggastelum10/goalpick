import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Input validation limits
const MAX_EMAIL_LENGTH = 255;
const MAX_NAME_LENGTH = 100;
const MAX_INVITE_CODE_LENGTH = 50;

interface InviteRequest {
  email: string;
  leagueId: string;
  leagueName: string;
  inviterName: string;
  inviteCode: string;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-LEAGUE-INVITE] ${step}${detailsStr}`);
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Authentication check - require valid user session
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing or invalid authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      logStep("Authentication failed", { error: claimsError?.message });
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = claimsData.claims.sub;
    logStep("User authenticated", { userId });

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const { email, leagueName, inviterName, inviteCode }: InviteRequest = await req.json();

    // Validate required fields
    if (!email || !leagueName || !inviteCode) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Input length validation
    if (email.length > MAX_EMAIL_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Email exceeds maximum length of ${MAX_EMAIL_LENGTH} characters` }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    if (leagueName.length > MAX_NAME_LENGTH) {
      return new Response(
        JSON.stringify({ error: `League name exceeds maximum length of ${MAX_NAME_LENGTH} characters` }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    if (inviterName && inviterName.length > MAX_NAME_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Inviter name exceeds maximum length of ${MAX_NAME_LENGTH} characters` }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    if (inviteCode.length > MAX_INVITE_CODE_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Invite code exceeds maximum length of ${MAX_INVITE_CODE_LENGTH} characters` }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Construct invite URL - always use the production GOALPICK domain
    // so shared links never leak preview/sandbox hostnames.
    // Append a slugified league name for a friendlier, more personal link.
    const slug = leagueName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
    const inviteUrl = slug
      ? `https://goalpick.app/join/${inviteCode}/${slug}`
      : `https://goalpick.app/join/${inviteCode}`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb; padding: 40px 20px; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 30px; text-align: center;">
            <img src="https://cup-corner-clash.lovable.app/email-logo.png" alt="GOALPICK" style="max-width: 180px; height: auto; margin-bottom: 10px;" />
            <p style="color: #93c5fd; margin: 0; font-size: 16px;">Football Prediction League Invitation</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">You're Invited! 🎉</h2>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              <strong>${inviterName || "A friend"}</strong> has invited you to join their prediction league:
            </p>
            
            <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 0 0 30px 0; text-align: center;">
              <h3 style="color: #1f2937; margin: 0; font-size: 22px;">${leagueName}</h3>
            </div>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
              Compete with friends by predicting match outcomes on GOALPICK. Make your predictions, climb the leaderboard, and win prizes!
            </p>
            
            <div style="text-align: center;">
              <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 18px; font-weight: bold;">
                Join League
              </a>
            </div>
            
            <p style="color: #9ca3af; font-size: 14px; margin: 30px 0 0 0; text-align: center;">
              Or copy this link: <a href="${inviteUrl}" style="color: #2563eb;">${inviteUrl}</a>
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              You received this email because someone invited you to their league.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Call Resend API directly with fetch
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "GOALPICK <noreply@goose-golf.com>",
        to: [email],
        subject: `${inviterName || "Someone"} invited you to join ${leagueName}!`,
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json();
      console.error("Resend API error:", errorData);
      throw new Error(errorData.message || "Failed to send email");
    }

    const emailData = await resendResponse.json();
    console.log("Invite email sent successfully:", emailData);

    return new Response(JSON.stringify({ success: true, id: emailData.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-league-invite function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send invitation" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
