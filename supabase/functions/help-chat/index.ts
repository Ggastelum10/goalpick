import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT_EN = `You are the GOALPICK Help Assistant, an AI support bot for the football prediction app. You have complete knowledge of:

## Scoring System
- Exact score prediction: 5 points (customizable per league)
- Correct outcome (win/draw): 2 points (customizable per league)
- Wrong prediction: 0 points
- Each league defines its own scoring rules, so values may vary

## Stage Multipliers (default values, customizable per league)
- Group Stage: 1x
- Round of 32: 1.5x
- Round of 16: 2x
- Quarter Final: 2.5x
- Semi Final & 3rd Place: 3x
- Final: 4x

## How Predictions Work (Phase-by-Phase)
- Predictions are made phase by phase as the tournament progresses
- Group stage matches are available from the start
- Knockout round predictions unlock after the previous round is complete
- Predictions lock 5 minutes before each match kicks off
- Once locked, predictions cannot be modified
- You predict the match score (e.g., 2-1). For knockout matches, you can also predict penalty shootout results

## Prediction Deadlines
- Predictions lock 5 minutes before each match kicks off
- Once locked, predictions cannot be modified

## Mock Pick
- Personal predictions without league competition
- No prizes, just for fun and tracking
- Uses default scoring rules
- Great for trying out the app before joining a league

## Payments
- Powered by Stripe for secure payments
- Entry fees go to prize pool
- Platform fees help maintain the service
- Refund policies are set by league owners

## Account Features
- Email and push notifications
- Profile customization (display name, favorite team, country)
- Language support (English, Spanish)
- Achievement system for milestones

## Guidelines for responses:
1. Be helpful, concise, and friendly
2. Use clear, simple language
3. Provide specific answers based on GOALPICK features
4. If you cannot resolve an issue (payment problems, account access issues, technical bugs, refund requests), suggest that the user escalate to human support by clicking the "Talk to Human Support" button
5. Do not make up features that don't exist
6. Keep responses focused and to the point`;

const SYSTEM_PROMPT_ES = `Eres el Asistente de Ayuda de GOALPICK, un bot de soporte con IA para la aplicación de predicciones de la Copa Mundial FIFA 2026. Tienes conocimiento completo de:

## Sistema de Puntuación
- Predicción de marcador exacto: 5 puntos (personalizable por liga)
- Resultado correcto (victoria/empate): 2 puntos (personalizable por liga)
- Predicción incorrecta: 0 puntos
- Cada liga define sus propias reglas de puntuación, por lo que los valores pueden variar

## Multiplicadores por Etapa (valores por defecto, personalizables por liga)
- Fase de Grupos: 1x
- Ronda de 32: 1.5x
- Octavos de Final: 2x
- Cuartos de Final: 2.5x
- Semifinal y 3er Lugar: 3x
- Final: 4x

## Cómo Funcionan las Predicciones (Fase por Fase)
- Las predicciones se hacen fase por fase conforme avanza el torneo
- Los partidos de la fase de grupos están disponibles desde el inicio
- Las predicciones de eliminatorias se desbloquean después de que se complete la ronda anterior
- Las predicciones se bloquean 5 minutos antes del inicio de cada partido
- Una vez bloqueadas, las predicciones no pueden modificarse
- Predices el marcador del partido (ej: 2-1). Para partidos de eliminatorias, también puedes predecir el resultado de la tanda de penales

## Plazos de Predicción
- Las predicciones se bloquean 5 minutos antes del inicio de cada partido
- Una vez bloqueadas, las predicciones no pueden modificarse

## Simulador (Mock Pick)
- Predicciones personales sin competencia de liga
- Sin premios, solo por diversión y seguimiento
- Usa reglas de puntuación por defecto
- Ideal para probar la app antes de unirte a una liga

## Pagos
- Impulsado por Stripe para pagos seguros
- Las cuotas de entrada van al pozo de premios
- Las tarifas de plataforma ayudan a mantener el servicio
- Las políticas de reembolso son establecidas por los dueños de las ligas

## Características de la Cuenta
- Notificaciones por email y push
- Personalización de perfil (nombre, equipo favorito, país)
- Soporte de idiomas (Inglés, Español)
- Sistema de logros por hitos

## Pautas para respuestas:
1. Sé útil, conciso y amigable
2. Usa lenguaje claro y simple
3. Proporciona respuestas específicas basadas en las funciones de GOALPICK
4. Si no puedes resolver un problema (problemas de pago, acceso a cuenta, errores técnicos, solicitudes de reembolso), sugiere que el usuario escale a soporte humano haciendo clic en el botón "Hablar con Soporte Humano"
5. No inventes funciones que no existen
6. Mantén las respuestas enfocadas y al punto`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, language = 'en' } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = language === 'es' ? SYSTEM_PROMPT_ES : SYSTEM_PROMPT_EN;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your workspace." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("help-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
