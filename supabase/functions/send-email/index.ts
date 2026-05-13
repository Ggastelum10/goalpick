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
const MAX_URL_LENGTH = 2000;

type EmailType = 'welcome' | 'payment' | 'league-joined' | 'league-invite' | 'password-reset' | 'daily-reminder' | 'daily-summary';

interface EmailRequest {
  type: EmailType;
  to: string;
  data: Record<string, any>;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-EMAIL] ${step}${detailsStr}`);
};

// Validate and sanitize string input
const validateStringInput = (value: string | undefined, maxLength: number, fieldName: string): string => {
  if (!value) return '';
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }
  if (value.length > maxLength) {
    throw new Error(`${fieldName} exceeds maximum length of ${maxLength} characters`);
  }
  return value.trim();
};

// Shared email styles
const getEmailWrapper = (content: string) => `
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
      <p style="color: #93c5fd; margin: 0; font-size: 16px;">Football Predictions 2026</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      ${content}
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        © 2026 GOALPICK. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
`;

const getButton = (url: string, text: string) => `
<div style="text-align: center; margin: 30px 0;">
  <a href="${url}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 18px; font-weight: bold;">
    ${text}
  </a>
</div>
`;

// Email templates
const getWelcomeEmail = (data: { displayName: string; loginUrl: string }) => {
  const content = `
    <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Welcome to GOALPICK! 🎉</h2>
    
    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Hi <strong>${data.displayName}</strong>,
    </p>
    
    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Welcome to GOALPICK! You've successfully created your account and you're ready to start predicting football matches.
    </p>
    
    <div style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin: 0 0 20px 0; border-left: 4px solid #22c55e;">
      <h3 style="color: #166534; margin: 0 0 10px 0; font-size: 16px;">🏆 What's Next?</h3>
      <ul style="color: #4b5563; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
        <li>Join or create a prediction league</li>
        <li>Start making match predictions</li>
        <li>Compete with friends on the leaderboard</li>
        <li>Win prizes!</li>
      </ul>
    </div>
    
    ${getButton(data.loginUrl, 'Start Predicting')}
    
    <p style="color: #9ca3af; font-size: 14px; margin: 0; text-align: center;">
      Good luck with your predictions! ⚽
    </p>
  `;
  
  return {
    subject: "Welcome to GOALPICK! 🎉",
    html: getEmailWrapper(content)
  };
};

const getPaymentEmail = (data: { 
  displayName: string; 
  leagueName: string; 
  amount: number; 
  currency: string;
  dashboardUrl: string;
}) => {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: data.currency.toUpperCase()
  }).format(data.amount);

  const content = `
    <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Payment Confirmed! ✅</h2>
    
    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Hi <strong>${data.displayName}</strong>,
    </p>
    
    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Your payment has been successfully processed. Thank you for joining the league!
    </p>
    
    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 0 0 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">League</td>
          <td style="color: #1f2937; font-size: 14px; padding: 8px 0; text-align: right; font-weight: bold;">${data.leagueName}</td>
        </tr>
        <tr>
          <td style="color: #6b7280; font-size: 14px; padding: 8px 0; border-top: 1px solid #e5e7eb;">Amount Paid</td>
          <td style="color: #22c55e; font-size: 14px; padding: 8px 0; text-align: right; font-weight: bold; border-top: 1px solid #e5e7eb;">${formattedAmount}</td>
        </tr>
        <tr>
          <td style="color: #6b7280; font-size: 14px; padding: 8px 0; border-top: 1px solid #e5e7eb;">Status</td>
          <td style="color: #22c55e; font-size: 14px; padding: 8px 0; text-align: right; font-weight: bold; border-top: 1px solid #e5e7eb;">✓ Confirmed</td>
        </tr>
      </table>
    </div>
    
    ${getButton(data.dashboardUrl, 'Go to Dashboard')}
    
    <p style="color: #9ca3af; font-size: 14px; margin: 0; text-align: center;">
      Start making predictions to climb the leaderboard!
    </p>
  `;
  
  return {
    subject: `Payment Confirmed - ${data.leagueName}`,
    html: getEmailWrapper(content)
  };
};

const getLeagueJoinedEmail = (data: { 
  displayName: string; 
  leagueName: string; 
  leagueUrl: string;
}) => {
  const content = `
    <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">You've Joined ${data.leagueName}! 🏆</h2>
    
    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Hi <strong>${data.displayName}</strong>,
    </p>
    
    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Welcome to <strong>${data.leagueName}</strong>! Your registration is complete and you're ready to compete.
    </p>
    
    <div style="background-color: #eff6ff; border-radius: 8px; padding: 20px; margin: 0 0 20px 0; border-left: 4px solid #2563eb;">
      <h3 style="color: #1e40af; margin: 0 0 10px 0; font-size: 16px;">🎯 Quick Tips</h3>
      <ul style="color: #4b5563; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
        <li>Predictions lock 5 minutes before kickoff</li>
        <li>Earn 3 points for exact score, 1 for correct outcome</li>
        <li>Check the leaderboard to track your progress</li>
      </ul>
    </div>
    
    ${getButton(data.leagueUrl, 'View League')}
    
    <p style="color: #9ca3af; font-size: 14px; margin: 0; text-align: center;">
      Good luck! May the best predictor win! 🏆
    </p>
  `;
  
  return {
    subject: `Welcome to ${data.leagueName}!`,
    html: getEmailWrapper(content)
  };
};

const getLeagueInviteEmail = (data: { 
  inviterName: string; 
  leagueName: string; 
  inviteUrl: string;
}) => {
  const content = `
    <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">You're Invited! 🎉</h2>
    
    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      <strong>${data.inviterName || "A friend"}</strong> has invited you to join their prediction league:
    </p>
    
    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 0 0 30px 0; text-align: center;">
      <h3 style="color: #1f2937; margin: 0; font-size: 22px;">${data.leagueName}</h3>
    </div>
    
    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
      Compete with friends by predicting football match outcomes on GOALPICK. Make your predictions, climb the leaderboard, and win prizes!
    </p>
    
    ${getButton(data.inviteUrl, 'Join League')}
    
    <p style="color: #9ca3af; font-size: 14px; margin: 30px 0 0 0; text-align: center;">
      Or copy this link: <a href="${data.inviteUrl}" style="color: #2563eb;">${data.inviteUrl}</a>
    </p>
  `;
  
  return {
    subject: `${data.inviterName || "Someone"} invited you to join ${data.leagueName}!`,
    html: getEmailWrapper(content)
  };
};

const getPasswordResetEmail = (data: { 
  displayName: string; 
  resetUrl: string;
}) => {
  const content = `
    <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Reset Your Password 🔐</h2>
    
    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Hi <strong>${data.displayName || "there"}</strong>,
    </p>
    
    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      We received a request to reset your password. Click the button below to create a new password:
    </p>
    
    ${getButton(data.resetUrl, 'Reset Password')}
    
    <div style="background-color: #fef3c7; border-radius: 8px; padding: 15px 20px; margin: 20px 0 0 0; border-left: 4px solid #f59e0b;">
      <p style="color: #92400e; font-size: 14px; margin: 0;">
        <strong>⚠️ Security Notice:</strong> If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.
      </p>
    </div>
    
    <p style="color: #9ca3af; font-size: 14px; margin: 30px 0 0 0; text-align: center;">
      This link will expire in 1 hour for security reasons.
    </p>
  `;
  
  return {
    subject: "Reset Your GOALPICK Password",
    html: getEmailWrapper(content)
  };
};

const getDailyReminderEmail = (data: { 
  displayName: string; 
  matches: Array<{
    homeTeam: string;
    awayTeam: string;
    matchDate: string;
    stage: string;
  }>;
  dashboardUrl: string;
}) => {
  const matchList = data.matches.map(match => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
        <strong>${match.homeTeam}</strong> vs <strong>${match.awayTeam}</strong>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #6b7280;">
        ${match.matchDate}
      </td>
    </tr>
  `).join('');

  const content = `
    <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">⚽ Don't Forget Your Predictions!</h2>
    
    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Hi <strong>${data.displayName}</strong>,
    </p>
    
    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      You have <strong>${data.matches.length} match${data.matches.length === 1 ? '' : 'es'}</strong> coming up in the next 24 hours! Make sure to submit or update your predictions before kickoff.
    </p>
    
    <div style="background-color: #f9fafb; border-radius: 8px; overflow: hidden; margin: 0 0 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background-color: #1e3a5f;">
            <th style="padding: 12px; text-align: left; color: white; font-size: 14px;">Match</th>
            <th style="padding: 12px; text-align: right; color: white; font-size: 14px;">Kickoff</th>
          </tr>
        </thead>
        <tbody>
          ${matchList}
        </tbody>
      </table>
    </div>
    
    ${getButton(data.dashboardUrl, 'Make Predictions')}
    
    <div style="background-color: #fef3c7; border-radius: 8px; padding: 15px 20px; margin: 20px 0 0 0; border-left: 4px solid #f59e0b;">
      <p style="color: #92400e; font-size: 14px; margin: 0;">
        <strong>⏰ Remember:</strong> Predictions lock 5 minutes before each match kicks off!
      </p>
    </div>
  `;
  
  return {
    subject: `🎯 ${data.matches.length} Match${data.matches.length === 1 ? '' : 'es'} Starting Soon - Submit Your Predictions!`,
    html: getEmailWrapper(content)
  };
};

const getDailySummaryEmail = (data: { 
  displayName: string;
  matchResults: Array<{
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    pointsEarned: number;
    wasExact: boolean;
  }>;
  totalPointsToday: number;
  totalPoints: number;
  currentRank: number;
  rankChange: number;
  dashboardUrl: string;
}) => {
  const matchResultsList = data.matchResults.map(match => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
        <strong>${match.homeTeam}</strong> ${match.homeScore} - ${match.awayScore} <strong>${match.awayTeam}</strong>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
        ${match.wasExact ? '🎯' : match.pointsEarned > 0 ? '✓' : '✗'}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold; color: ${match.pointsEarned > 0 ? '#22c55e' : '#9ca3af'};">
        +${match.pointsEarned}
      </td>
    </tr>
  `).join('');

  const rankChangeText = data.rankChange > 0 
    ? `<span style="color: #22c55e;">↑ ${data.rankChange}</span>` 
    : data.rankChange < 0 
      ? `<span style="color: #ef4444;">↓ ${Math.abs(data.rankChange)}</span>`
      : '<span style="color: #9ca3af;">−</span>';

  const content = `
    <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">📊 Your Daily Summary</h2>
    
    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Hi <strong>${data.displayName}</strong>,
    </p>
    
    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Here's your daily update from GOALPICK. Check out how your predictions performed!
    </p>
    
    <!-- Stats Overview -->
    <div style="display: flex; margin: 0 0 20px 0;">
      <div style="flex: 1; background-color: #f0fdf4; border-radius: 8px; padding: 15px; margin-right: 8px; text-align: center;">
        <p style="color: #22c55e; font-size: 24px; font-weight: bold; margin: 0;">+${data.totalPointsToday}</p>
        <p style="color: #4b5563; font-size: 12px; margin: 5px 0 0 0;">Points Today</p>
      </div>
      <div style="flex: 1; background-color: #eff6ff; border-radius: 8px; padding: 15px; margin-right: 8px; text-align: center;">
        <p style="color: #2563eb; font-size: 24px; font-weight: bold; margin: 0;">${data.totalPoints}</p>
        <p style="color: #4b5563; font-size: 12px; margin: 5px 0 0 0;">Total Points</p>
      </div>
      <div style="flex: 1; background-color: #fef3c7; border-radius: 8px; padding: 15px; text-align: center;">
        <p style="color: #f59e0b; font-size: 24px; font-weight: bold; margin: 0;">#${data.currentRank}</p>
        <p style="color: #4b5563; font-size: 12px; margin: 5px 0 0 0;">Rank ${rankChangeText}</p>
      </div>
    </div>
    
    ${data.matchResults.length > 0 ? `
    <div style="background-color: #f9fafb; border-radius: 8px; overflow: hidden; margin: 0 0 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background-color: #1e3a5f;">
            <th style="padding: 12px; text-align: left; color: white; font-size: 14px;">Match Result</th>
            <th style="padding: 12px; text-align: center; color: white; font-size: 14px;"></th>
            <th style="padding: 12px; text-align: right; color: white; font-size: 14px;">Points</th>
          </tr>
        </thead>
        <tbody>
          ${matchResultsList}
        </tbody>
      </table>
    </div>
    ` : `
    <p style="color: #9ca3af; font-size: 14px; text-align: center; padding: 20px;">
      No match results from today.
    </p>
    `}
    
    ${getButton(data.dashboardUrl, 'View Dashboard')}
    
    <p style="color: #9ca3af; font-size: 12px; margin: 20px 0 0 0; text-align: center;">
      You can manage your notification preferences in your profile settings.
    </p>
  `;
  
  return {
    subject: `📊 Daily Summary: +${data.totalPointsToday} points | Rank #${data.currentRank}`,
    html: getEmailWrapper(content)
  };
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Email function started");

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

    const { type, to, data }: EmailRequest = await req.json();
    logStep("Request received", { type, to });

    // Validate required fields
    if (!type || !to) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: type and to" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Input length validation
    if (to.length > MAX_EMAIL_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Email address exceeds maximum length of ${MAX_EMAIL_LENGTH} characters` }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate data fields based on email type
    if (data) {
      if (data.displayName) validateStringInput(data.displayName, MAX_NAME_LENGTH, 'displayName');
      if (data.leagueName) validateStringInput(data.leagueName, MAX_NAME_LENGTH, 'leagueName');
      if (data.inviterName) validateStringInput(data.inviterName, MAX_NAME_LENGTH, 'inviterName');
      if (data.loginUrl) validateStringInput(data.loginUrl, MAX_URL_LENGTH, 'loginUrl');
      if (data.dashboardUrl) validateStringInput(data.dashboardUrl, MAX_URL_LENGTH, 'dashboardUrl');
      if (data.leagueUrl) validateStringInput(data.leagueUrl, MAX_URL_LENGTH, 'leagueUrl');
      if (data.inviteUrl) validateStringInput(data.inviteUrl, MAX_URL_LENGTH, 'inviteUrl');
      if (data.resetUrl) validateStringInput(data.resetUrl, MAX_URL_LENGTH, 'resetUrl');
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate email content based on type
    let emailContent: { subject: string; html: string };

    switch (type) {
      case 'welcome':
        emailContent = getWelcomeEmail(data as any);
        break;
      case 'payment':
        emailContent = getPaymentEmail(data as any);
        break;
      case 'league-joined':
        emailContent = getLeagueJoinedEmail(data as any);
        break;
      case 'league-invite':
        emailContent = getLeagueInviteEmail(data as any);
        break;
      case 'password-reset':
        emailContent = getPasswordResetEmail(data as any);
        break;
      case 'daily-reminder':
        emailContent = getDailyReminderEmail(data as any);
        break;
      case 'daily-summary':
        emailContent = getDailySummaryEmail(data as any);
        break;
      default:
        return new Response(
          JSON.stringify({ error: `Unknown email type: ${type}` }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
    }

    logStep("Sending email", { subject: emailContent.subject });

    // Send email via Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "GOALPICK <noreply@goose-golf.com>",
        to: [to],
        subject: emailContent.subject,
        html: emailContent.html,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json();
      logStep("Resend API error", errorData);
      throw new Error(errorData.message || "Failed to send email");
    }

    const emailData = await resendResponse.json();
    logStep("Email sent successfully", { id: emailData.id });

    return new Response(
      JSON.stringify({ success: true, id: emailData.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send email" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
