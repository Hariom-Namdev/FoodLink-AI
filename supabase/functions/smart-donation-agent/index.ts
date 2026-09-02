// Smart Donation AI Agent — custom backend agent (no third-party agent framework)
// Lifecycle: monitor → detect → validate → find nearest NGO → notify → wait →
//   accept (update status, remove from public list, notify donor) OR
//   reject/timeout (try next nearest NGO) → log everything.
//
// This edge function is invoked two ways:
//   1. Cron-style poll (POST with no body) — picks up pending/timed-out tasks.
//   2. Webhook from NGO response (POST {task_id, ngo_id, response}) — processes
//      an accept/reject immediately without waiting for the timeout.
//
// The agent uses Gemini only for optional reasoning (validation heuristics).
// All monitoring, workflow execution, notifications, status updates, and
// automation are handled by this custom agent code.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function getApiKey(): Promise<string> {
  const envKey = Deno.env.get("GEMINI_API_KEY");
  if (envKey && envKey.trim().length > 0) return envKey.trim();

  const { data, error } = await supabase.rpc("get_secret", { p_name: "GEMINI_API_KEY" });
  if (error || !data) return "";
  return (data as string).trim();
}

// NGO response timeout: how long to wait before trying the next NGO.
const NGO_TIMEOUT_MS = 45_000; // 45 seconds per NGO
const MAX_RETRIES = 10; // max NGOs to try before giving up

// ============ Haversine distance (km) ============
function haversineKm(
  lat1: number, lng1: number, lat2: number, lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ============ Gemini reasoning (optional, for validation) ============
async function geminiValidate(donation: any): Promise<{
  valid: boolean;
  reason: string;
  freshness_adjustment: number;
}> {
  try {
    const prompt = `You are a food safety validator. Analyze this food donation and determine if it's safe to distribute.
Return JSON only: {"valid": true/false, "reason": "short explanation", "freshness_adjustment": number between -20 and 0}

Donation:
- Food: ${donation.food_item}
- Category: ${donation.category}
- Quantity: ${donation.quantity} servings
- Meals: ${donation.meals}
- Expiry: ${donation.expiry_hours} hours
- Freshness score: ${donation.freshness_score}/100
- Prep time: ${donation.prep_time}

Rules: Reject if expiry_hours < 1 or freshness_score < 40 or quantity <= 0. Otherwise accept.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    const apiKey = await getApiKey();
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 256 },
        }),
        signal: controller.signal,
      },
    );
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`Gemini ${res.status}`);
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in Gemini response");
    return JSON.parse(jsonMatch[0]);
  } catch {
    // Fallback: basic rule-based validation if Gemini is unavailable
    const valid = donation.expiry_hours >= 1 &&
      donation.freshness_score >= 40 &&
      donation.quantity > 0;
    return {
      valid,
      reason: valid ? "Passed basic validation" : "Failed basic validation",
      freshness_adjustment: 0,
    };
  }
}

// ============ Find nearest NGOs ============
async function findNearestNGOs(
  donation: any,
  excludeIds: string[],
): Promise<any[]> {
  // Get NGOs in the same city first, then all others, sorted by distance
  const { data: allNgos, error } = await supabase
    .from("ngos")
    .select("id, name, city, lat, lng, capacity, category")
    .eq("verified", true);

  if (error || !allNgos) return [];

  const excludeSet = new Set(excludeIds);

  const withDistance = allNgos
    .filter((n) => !excludeSet.has(n.id))
    .map((n) => {
      let distance = 9999;
      if (donation.lat && donation.lng && n.lat && n.lng) {
        distance = haversineKm(
          donation.lat, donation.lng,
          n.lat, n.lng,
        );
      }
      // Same city gets a distance bonus (priority)
      if (n.city === donation.city) distance -= 100;
      return { ...n, distance };
    })
    .sort((a, b) => a.distance - b.distance);

  return withDistance;
}

// ============ Log helper ============
async function log(
  action: string,
  taskId?: string,
  donationId?: string,
  ngoId?: string,
  details?: Record<string, any>,
) {
  await supabase.rpc("log_agent_activity", {
    p_action: action,
    p_task_id: taskId || null,
    p_donation_id: donationId || null,
    p_ngo_id: ngoId || null,
    p_details: details || {},
  });
}

// ============ Notify helper ============
async function notify(
  taskId: string,
  donationId: string,
  recipientType: "donor" | "ngo",
  message: string,
  type: string,
  recipientId?: string,
  ngoId?: string,
) {
  await supabase.rpc("create_agent_notification", {
    p_task_id: taskId,
    p_donation_id: donationId,
    p_recipient_type: recipientType,
    p_message: message,
    p_recipient_id: recipientId || null,
    p_ngo_id: ngoId || null,
    p_type: type,
  });
}

// ============ Process a single task ============
async function processTask(task: {
  task_id: string;
  donation_id: string;
  status: string;
  current_ngo_id: string | null;
  notified_ngo_ids: string[];
  timeout_at: string | null;
}) {
  const taskId = task.task_id;
  const donationId = task.donation_id;

  // Fetch the donation
  const { data: donation, error: donationErr } = await supabase
    .from("donations")
    .select("*")
    .eq("id", donationId)
    .maybeSingle();

  if (donationErr || !donation) {
    await log("donation_not_found", taskId, donationId);
    await supabase.from("agent_tasks").update({
      status: "failed",
      error: "Donation not found",
    }).eq("id", taskId);
    return;
  }

  // If donation is already claimed/delivered, mark task completed
  if (donation.status !== "available") {
    await log("donation_already_processed", taskId, donationId, null, {
      status: donation.status,
    });
    await supabase.from("agent_tasks").update({
      status: "completed",
    }).eq("id", taskId);
    return;
  }

  // Log detection
  await log("donation_detected", taskId, donationId, null, {
    food_item: donation.food_item,
    category: donation.category,
    quantity: donation.quantity,
    city: donation.city,
    freshness_score: donation.freshness_score,
  });

  // Step 1: Validate
  const validation = await geminiValidate(donation);
  await log("validated", taskId, donationId, null, {
    valid: validation.valid,
    reason: validation.reason,
    freshness_adjustment: validation.freshness_adjustment,
  });

  if (!validation.valid) {
    await log("validation_failed", taskId, donationId, null, {
      reason: validation.reason,
    });
    await supabase.rpc("update_donation_status", {
      p_donation_id: donationId,
      p_status: "available", // keep available but flag
    });
    await supabase.from("agent_tasks").update({
      status: "failed",
      error: `Validation failed: ${validation.reason}`,
    }).eq("id", taskId);

    await notify(
      taskId, donationId, "donor",
      `Your donation "${donation.food_item}" could not be processed: ${validation.reason}`,
      "rejected",
      donation.restaurant_id,
    );
    return;
  }

  // Step 2: Find nearest NGO (excluding already-notified ones)
  const excludeIds = task.notified_ngo_ids || [];
  const candidates = await findNearestNGOs(donation, excludeIds);

  if (candidates.length === 0) {
    await log("no_ngos_available", taskId, donationId);
    await supabase.from("agent_tasks").update({
      status: "failed",
      error: "No more NGOs available to notify",
    }).eq("id", taskId);

    await notify(
      taskId, donationId, "donor",
      `Your donation "${donation.food_item}" could not be matched to an NGO. We will try again later.`,
      "rejected",
      donation.restaurant_id,
    );
    return;
  }

  // Pick the nearest NGO
  const ngo = candidates[0];
  const newNotifiedIds = [...excludeIds, ngo.id];

  await log("ngo_notified", taskId, donationId, ngo.id, {
    ngo_name: ngo.name,
    ngo_city: ngo.city,
    distance_km: ngo.distance,
  });

  // Notify the NGO
  await notify(
    taskId, donationId, "ngo",
    `New food donation available: ${donation.food_item} (${donation.quantity} servings, ${donation.meals} meals) from ${donation.restaurant_name} in ${donation.city}. Freshness score: ${donation.freshness_score}/100. Please accept or reject.`,
    "accept_request",
    undefined,
    ngo.id,
  );

  // Update task to awaiting_response
  await supabase.from("agent_tasks").update({
    status: "awaiting_response",
    current_ngo_id: ngo.id,
    notified_ngo_ids: newNotifiedIds,
    timeout_at: new Date(Date.now() + NGO_TIMEOUT_MS).toISOString(),
    retry_count: (task.notified_ngo_ids?.length || 0),
  }).eq("id", taskId);
}

// ============ Process NGO response (accept/reject) ============
async function processNGOResponse(
  taskId: string,
  ngoId: string,
  response: "accept" | "reject",
) {
  const { data: task, error: taskErr } = await supabase
    .from("agent_tasks")
    .select("*")
    .eq("id", taskId)
    .maybeSingle();

  if (taskErr || !task) {
    return { error: "Task not found" };
  }

  // Only process if this is the current NGO
  if (task.current_ngo_id !== ngoId) {
    return { error: "This NGO is no longer the current recipient" };
  }

  const { data: donation } = await supabase
    .from("donations")
    .select("*")
    .eq("id", task.donation_id)
    .maybeSingle();

  if (!donation) return { error: "Donation not found" };

  const { data: ngo } = await supabase
    .from("ngos")
    .select("name, city")
    .eq("id", ngoId)
    .maybeSingle();

  if (!ngo) return { error: "NGO not found" };

  if (response === "accept") {
    // Step: NGO accepted → update status, create claim, remove from public list, notify donor
    await log("ngo_accepted", taskId, task.donation_id, ngoId, {
      ngo_name: ngo.name,
    });

    // Create claim + update donation status to 'claimed'
    const { data: claimId, error: claimErr } = await supabase.rpc(
      "create_claim_for_ngo",
      {
        p_donation_id: task.donation_id,
        p_ngo_id: ngoId,
        p_ngo_name: ngo.name,
      },
    );

    if (claimErr) {
      await log("claim_creation_failed", taskId, task.donation_id, ngoId, {
        error: claimErr.message,
      });
      return { error: "Failed to create claim" };
    }

    await log("status_updated", taskId, task.donation_id, ngoId, {
      from: "available",
      to: "claimed",
      claim_id: claimId,
    });

    // Notify donor
    await notify(
      taskId, task.donation_id, "donor",
      `Great news! ${ngo.name} has accepted your donation "${donation.food_item}". They will arrange pickup shortly.`,
      "accepted",
      donation.restaurant_id,
    );

    // Notify NGO confirmation
    await notify(
      taskId, task.donation_id, "ngo",
      `You have accepted the donation "${donation.food_item}" from ${donation.restaurant_name}. Please coordinate pickup.`,
      "accepted",
      undefined,
      ngoId,
    );

    // Mark task completed
    await supabase.from("agent_tasks").update({
      status: "completed",
      current_ngo_id: null,
      timeout_at: null,
    }).eq("id", taskId);

    await log("task_completed", taskId, task.donation_id, ngoId);

    // Auto-complete delivery after a short delay (simulated pickup + delivery)
    // In production this would wait for volunteer assignment, but for the
    // automated lifecycle we transition to 'delivered' after the claim.
    EdgeRuntime.waitUntil((async () => {
      await new Promise((r) => setTimeout(r, 10_000)); // 10s simulated delivery
      await supabase.rpc("complete_donation_delivery", {
        p_donation_id: task.donation_id,
        p_ngo_id: ngoId,
      });
      await log("donation_delivered", taskId, task.donation_id, ngoId);
      await notify(
        taskId, task.donation_id, "donor",
        `Your donation "${donation.food_item}" has been delivered to ${ngo.name}. Thank you for feeding ${donation.meals} people!`,
        "completed",
        donation.restaurant_id,
      );
    })());

    return { success: true, claim_id: claimId };
  } else {
    // NGO rejected → try next NGO
    await log("ngo_rejected", taskId, task.donation_id, ngoId, {
      ngo_name: ngo.name,
    });

    await notify(
      taskId, task.donation_id, "donor",
      `${ngo.name} declined your donation. Finding the next nearest NGO...`,
      "rejected",
      donation.restaurant_id,
    );

    // Re-queue the task for the next poll cycle
    await supabase.from("agent_tasks").update({
      status: "validating", // will be reprocessed immediately
      current_ngo_id: null,
      timeout_at: null,
    }).eq("id", taskId);

    // Immediately process the next NGO
    await processTask({
      task_id: taskId,
      donation_id: task.donation_id,
      status: "validating",
      current_ngo_id: null,
      notified_ngo_ids: task.notified_ngo_ids,
      timeout_at: null,
    });

    return { success: true, message: "Trying next NGO" };
  }
}

// ============ Main handler ============
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};

    // Mode 1: NGO response webhook
    if (body.task_id && body.ngo_id && body.response) {
      const result = await processNGOResponse(
        body.task_id,
        body.ngo_id,
        body.response,
      );
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mode 2: Seed NGOs if table is empty
    if (body.seed === true) {
      const ngoData = [
        { name: "Akshaya Patra Foundation", city: "Bengaluru", capacity: 50000, category: "Midday Meal", phone: "+91-80-7197-7900", email: "info@akshayapatra.org", verified: true, lat: "12.9716", lng: "77.5946" },
        { name: "Feeding India", city: "Delhi", capacity: 30000, category: "Food Rescue", phone: "+91-11-4655-4321", email: "connect@feedingindia.org", verified: true, lat: "28.6139", lng: "77.2090" },
        { name: "Robin Hood Army", city: "Mumbai", capacity: 25000, category: "Food Rescue", phone: "+91-22-4000-1234", email: "mumbai@rha.org", verified: true, lat: "19.0760", lng: "72.8777" },
        { name: "Goonj", city: "Delhi", capacity: 20000, category: "Relief & Aid", phone: "+91-11-2697-9232", email: "mail@goonj.org", verified: true, lat: "28.6139", lng: "77.2090" },
        { name: "Smile Foundation", city: "Hyderabad", capacity: 22000, category: "Child Welfare", phone: "+91-40-2345-6789", email: "info@smilefoundation.org", verified: true, lat: "17.3850", lng: "78.4867" },
        { name: "Annakshetra Foundation", city: "Jaipur", capacity: 15000, category: "Food Rescue", phone: "+91-141-222-3333", email: "contact@annakshetra.org", verified: true, lat: "26.9124", lng: "75.7873" },
        { name: "ISKCON Food Relief", city: "Mumbai", capacity: 45000, category: "Midday Meal", phone: "+91-22-2870-0000", email: "foodrelief@iskconmumbai.org", verified: true, lat: "19.0760", lng: "72.8777" },
        { name: "No Food Waste", city: "Coimbatore", capacity: 12000, category: "Food Rescue", phone: "+91-422-456-7890", email: "info@nofoodwaste.in", verified: true, lat: "11.0168", lng: "76.9558" },
        { name: "Roti Bank Mumbai", city: "Mumbai", capacity: 10000, category: "Food Rescue", phone: "+91-22-2820-2020", email: "rotibankmumbai@gmail.com", verified: true, lat: "19.0760", lng: "72.8777" },
        { name: "Delhi Food Bank", city: "Delhi", capacity: 18000, category: "Food Bank", phone: "+91-11-4100-5678", email: "info@delhifoodbank.org", verified: true, lat: "28.6139", lng: "77.2090" },
        { name: "Khalsa Aid India", city: "Amritsar", capacity: 8000, category: "Relief & Aid", phone: "+91-183-501-2345", email: "india@khalsaaid.org", verified: true, lat: "31.6340", lng: "74.8723" },
        { name: "Rise Against Hunger India", city: "Bengaluru", capacity: 20000, category: "Meal Packaging", phone: "+91-80-4900-1234", email: "info@riseagainsthungerindia.org", verified: true, lat: "12.9716", lng: "77.5946" },
        { name: "Samarpan Foundation", city: "Delhi", capacity: 14000, category: "Child Welfare", phone: "+91-11-2410-9999", email: "info@samarpanfoundation.org", verified: true, lat: "28.6139", lng: "77.2090" },
        { name: "Make-A-Difference", city: "Bengaluru", capacity: 11000, category: "Child Welfare", phone: "+91-80-2660-1234", email: "info@makeadiff.in", verified: true, lat: "12.9716", lng: "77.5946" },
        { name: "Shanti Ashram", city: "Coimbatore", capacity: 9000, category: "Community Kitchen", phone: "+91-422-245-6789", email: "shanti@ashram.org", verified: true, lat: "11.0168", lng: "76.9558" },
        { name: "Seva Kitchen", city: "Pune", capacity: 10000, category: "Community Kitchen", phone: "+91-20-6640-1234", email: "info@sevakitchen.org", verified: true, lat: "18.5204", lng: "73.8567" },
        { name: "Hunger Free India", city: "Hyderabad", capacity: 16000, category: "Food Rescue", phone: "+91-40-6789-1234", email: "contact@hungerfreeindia.org", verified: true, lat: "17.3850", lng: "78.4867" },
        { name: "Food for Soul", city: "Chennai", capacity: 9000, category: "Community Kitchen", phone: "+91-44-2814-5678", email: "info@foodforsoul.in", verified: true, lat: "13.0827", lng: "80.2707" },
        { name: "Annamrita Foundation", city: "Mumbai", capacity: 28000, category: "Midday Meal", phone: "+91-22-3322-1122", email: "info@annamrita.org", verified: true, lat: "19.0760", lng: "72.8777" },
        { name: "Mera Parivar", city: "Noida", capacity: 7000, category: "Child Welfare", phone: "+91-120-456-7890", email: "info@meraparivar.org", verified: true, lat: "28.5355", lng: "77.3910" },
        { name: "Bhookh Mitao", city: "Ahmedabad", capacity: 9000, category: "Food Bank", phone: "+91-79-4040-1234", email: "info@bhookhmitao.org", verified: true, lat: "23.0225", lng: "72.5714" },
        { name: "Uday Foundation", city: "Delhi", capacity: 11000, category: "Child Welfare", phone: "+91-11-2656-1234", email: "info@udayfoundation.org", verified: true, lat: "28.6139", lng: "77.2090" },
        { name: "Pratham Education Foundation", city: "Mumbai", capacity: 13000, category: "Child Welfare", phone: "+91-22-6161-1234", email: "info@pratham.org", verified: true, lat: "19.0760", lng: "72.8777" },
        { name: "Action Against Hunger", city: "Mumbai", capacity: 17000, category: "Relief & Aid", phone: "+91-22-6705-1234", email: "india@actionagainsthunger.org", verified: true, lat: "19.0760", lng: "72.8777" },
        { name: "Salaam Baalak Trust", city: "Delhi", capacity: 8000, category: "Child Welfare", phone: "+91-11-2374-1234", email: "info@salaambaalak.org", verified: true, lat: "28.6139", lng: "77.2090" },
        { name: "Asha Deep Foundation", city: "Bengaluru", capacity: 7000, category: "Community Kitchen", phone: "+91-80-2345-6789", email: "info@ashadeep.org", verified: true, lat: "12.9716", lng: "77.5946" },
        { name: "Ekam Foundation", city: "Chennai", capacity: 8000, category: "Child Welfare", phone: "+91-44-2827-1234", email: "info@ekamoneness.org", verified: true, lat: "13.0827", lng: "80.2707" },
        { name: "Sankalp Volunteer Society", city: "Hyderabad", capacity: 6000, category: "Food Rescue", phone: "+91-40-2476-1234", email: "info@sankalpindia.org", verified: true, lat: "17.3850", lng: "78.4867" },
        { name: "Khidmat Foundation", city: "Kolkata", capacity: 7000, category: "Food Bank", phone: "+91-33-2289-1234", email: "info@khidmat.org", verified: true, lat: "22.5726", lng: "88.3639" },
        { name: "Aahar Foundation", city: "Pune", capacity: 9000, category: "Food Rescue", phone: "+91-20-3010-1234", email: "info@aaharfoundation.org", verified: true, lat: "18.5204", lng: "73.8567" },
        { name: "Jeevan Anand", city: "Surat", capacity: 6000, category: "Community Kitchen", phone: "+91-261-245-1234", email: "info@jeevananand.org", verified: true, lat: "21.1702", lng: "72.8311" },
      ];

      const { data: count, error } = await supabase.rpc("seed_ngos", {
        p_data: ngoData,
      });
      return new Response(JSON.stringify({
        success: true,
        ngos_seeded: count,
        error: error?.message,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mode 3: Poll — process pending and timed-out tasks
    // Claim and process one pending task
    const { data: pendingTask, error: claimErr } = await supabase.rpc(
      "claim_agent_task",
      { p_status_filter: "pending" },
    );

    if (claimErr) {
      return new Response(JSON.stringify({
        error: "Failed to claim task",
        details: claimErr.message,
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];

    if (pendingTask && pendingTask[0] && pendingTask[0].p_task_id) {
      const t = pendingTask[0];
      const task = {
        task_id: t.p_task_id,
        donation_id: t.p_donation_id,
        status: t.p_status,
        current_ngo_id: t.p_current_ngo_id,
        notified_ngo_ids: t.p_notified_ngo_ids,
        timeout_at: t.p_timeout_at,
      };
      await processTask(task);
      results.push({ task_id: task.task_id, status: "processed" });
    }

    // Also check for timed-out tasks (awaiting_response past timeout)
    const { data: timedOutTasks } = await supabase
      .from("agent_tasks")
      .select("*")
      .eq("status", "awaiting_response")
      .not("timeout_at", "is", null)
      .lt("timeout_at", new Date().toISOString())
      .limit(5);

    if (timedOutTasks && timedOutTasks.length > 0) {
      for (const task of timedOutTasks) {
        await log("ngo_timeout", task.id, task.donation_id, task.current_ngo_id, {
          ngo_id: task.current_ngo_id,
        });

        // Notify donor about timeout
        const { data: donation } = await supabase
          .from("donations")
          .select("restaurant_id, food_item")
          .eq("id", task.donation_id)
          .maybeSingle();

        if (donation) {
          await notify(
            task.id, task.donation_id, "donor",
            `The current NGO did not respond in time. Finding the next nearest NGO for your donation "${donation.food_item}"...`,
            "timeout",
            donation.restaurant_id,
          );
        }

        // Re-queue for next NGO
        await supabase.from("agent_tasks").update({
          status: "validating",
          current_ngo_id: null,
          timeout_at: null,
        }).eq("id", task.id);

        await processTask({
          task_id: task.id,
          donation_id: task.donation_id,
          status: "validating",
          current_ngo_id: null,
          notified_ngo_ids: task.notified_ngo_ids,
          timeout_at: null,
        });
        results.push({ task_id: task.id, status: "timeout_reprocessed" });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processed: results.length,
      tasks: results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("smart-donation-agent error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
