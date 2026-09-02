// AI Chatbot Edge Function - Gemini 3.5 Flash
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SYSTEM_PROMPT = `You are a helpful, knowledgeable AI assistant. Answer any question the user asks — coding, science, writing, math, general knowledge, advice, or anything else — concisely and accurately.

Background context (for reference only, when relevant): You are integrated into FoodLink AI, a smart food waste management platform in India that connects restaurants, hotels, bakeries, and supermarkets with NGOs to distribute surplus food. It operates across 30+ Indian cities. Features include food donation listings, NGO discovery, volunteer delivery with route optimization, AI-based freshness prediction, demand forecasting, image classification, duplicate detection, and an admin analytics dashboard. User roles: Restaurant, NGO, Volunteer, Admin.

Do not mention Google, Gemini, or any AI provider. Do not include ads.`;

const GEMINI_MODEL = "gemini-3.5-flash";

async function getApiKey(): Promise<string> {
  const envKey = Deno.env.get("GEMINI_API_KEY");
  if (envKey && envKey.trim().length > 0) return envKey.trim();

  // Fallback: read from Supabase vault via SECURITY DEFINER RPC
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.rpc("get_secret", { p_name: "GEMINI_API_KEY" });
  if (error || !data) return "";
  return (data as string).trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiKey = await getApiKey();
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured. Set it as an edge function secret or in the vault.");
    }

    const reply = await callGemini(apiKey, messages);

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("ai-chatbot error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

async function callGemini(apiKey: string, messages: { role: string; content: string }[]): Promise<string> {
  const recent = messages.slice(-6);
  const contents = recent.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
          topP: 0.9,
        },
      }),
      signal: controller.signal,
    });
  } catch (fetchErr) {
    clearTimeout(timeoutId);
    const m = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    throw new Error(`Gemini fetch failed: ${m}`);
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini API non-OK response:", response.status, errorText);
    throw new Error(`Gemini API ${response.status}: ${errorText}`);
  }

  const data = await response.json();

  if (data?.error) {
    const m = data.error.message || JSON.stringify(data.error);
    console.error("Gemini returned error field:", m);
    throw new Error(`Gemini error: ${m}`);
  }

  const candidates = data?.candidates;
  if (!candidates || candidates.length === 0) {
    console.error("Gemini returned no candidates. Full response:", JSON.stringify(data));
    throw new Error("Gemini returned no candidates");
  }

  const parts = candidates[0]?.content?.parts;
  if (!parts || parts.length === 0) {
    console.error("Gemini candidate has no parts. Full response:", JSON.stringify(data));
    throw new Error("Gemini returned empty content");
  }

  const text = parts.map((p: { text?: string }) => p.text || "").join("");
  const trimmed = text.trim();
  if (!trimmed) {
    console.error("Gemini returned empty text. Full response:", JSON.stringify(data));
    throw new Error("Gemini returned empty text");
  }

  return trimmed;
}
