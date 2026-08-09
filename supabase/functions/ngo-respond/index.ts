// NGO Response Endpoint
// Called by NGOs (via the frontend) to accept or reject a donation that the
// Smart Donation AI Agent has notified them about. This forwards the response
// to the agent function which processes the accept/reject workflow.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { task_id, ngo_id, response } = await req.json();

    if (!task_id || !ngo_id || !response) {
      return new Response(
        JSON.stringify({ error: "task_id, ngo_id, and response are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (response !== "accept" && response !== "reject") {
      return new Response(
        JSON.stringify({ error: "response must be 'accept' or 'reject'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Forward to the agent function which handles the full workflow
    const agentUrl = `${SUPABASE_URL}/functions/v1/smart-donation-agent`;
    const agentRes = await fetch(agentUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ task_id, ngo_id, response }),
    });

    const agentData = await agentRes.json();

    return new Response(JSON.stringify(agentData), {
      status: agentRes.ok ? 200 : agentRes.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
