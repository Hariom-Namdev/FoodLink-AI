// Expiry Prediction Agent
// Scans all available donations, predicts remaining shelf life based on
// food category, prep time, and freshness score, and flags donations
// that are at risk of expiring soon. Writes results to agent_outputs.
//
// Real-world responsibility: prevent food waste by alerting when donations
// are nearing expiry so the Donation Matching Agent can prioritize them.

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

// Category-based base shelf life in hours
const CATEGORY_SHELF_LIFE: Record<string, number> = {
  'Cooked Food': 6,
  'Rice': 8,
  'Curry': 5,
  'Vegetarian': 6,
  'Non-Veg': 4,
  'Bakery': 12,
  'Dairy': 4,
  'Dry Food': 48,
  'Grains': 48,
  'Canned': 168,
  'Mixed': 6,
};

function predictShelfLife(category: string, freshnessScore: number, expiryHours: number): {
  predictedHours: number;
  riskLevel: 'safe' | 'warning' | 'critical';
  confidence: number;
} {
  const baseShelfLife = CATEGORY_SHELF_LIFE[category] || 6;

  // Adjust based on freshness score (0-100)
  // Higher freshness = longer predicted shelf life
  const freshnessMultiplier = freshnessScore / 100;
  const predictedHours = Math.round(baseShelfLife * freshnessMultiplier);

  // Risk level based on expiry hours remaining
  let riskLevel: 'safe' | 'warning' | 'critical' = 'safe';
  if (expiryHours <= 2) riskLevel = 'critical';
  else if (expiryHours <= 4) riskLevel = 'warning';

  // Confidence: higher when freshness score is extreme (very high or very low)
  const confidence = Math.round(100 - Math.abs(50 - freshnessScore));

  return { predictedHours, riskLevel, confidence };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Fetch all available donations
    const { data: donations, error } = await supabase
      .from('donations')
      .select('id, food_item, category, freshness_score, expiry_hours, restaurant_name, city, created_at')
      .eq('status', 'available')
      .order('created_at', 'desc')
      .limit(50);

    if (error) throw error;

    let criticalCount = 0;
    let warningCount = 0;
    let safeCount = 0;
    const predictions: any[] = [];

    for (const d of donations || []) {
      const prediction = predictShelfLife(d.category, d.freshness_score, d.expiry_hours);

      if (prediction.riskLevel === 'critical') criticalCount++;
      else if (prediction.riskLevel === 'warning') warningCount++;
      else safeCount++;

      predictions.push({
        donation_id: d.id,
        food_item: d.food_item,
        restaurant_name: d.restaurant_name,
        city: d.city,
        category: d.category,
        freshness_score: d.freshness_score,
        expiry_hours: d.expiry_hours,
        predicted_shelf_life_hours: prediction.predictedHours,
        risk_level: prediction.riskLevel,
        confidence: prediction.confidence,
      });

      // Save individual output for critical/warning donations
      if (prediction.riskLevel !== 'safe') {
        await supabase.rpc('save_agent_output', {
          p_agent_type: 'expiry_prediction',
          p_severity: prediction.riskLevel === 'critical' ? 'critical' : 'warning',
          p_title: `${d.food_item} from ${d.restaurant_name} — ${prediction.riskLevel === 'critical' ? 'CRITICAL' : 'WARNING'}: expires in ${d.expiry_hours}h`,
          p_summary: `Predicted shelf life: ${prediction.predictedHours}h. Freshness: ${d.freshness_score}%. Risk: ${prediction.riskLevel}. Confidence: ${prediction.confidence}%.`,
          p_output: {
            predicted_shelf_life_hours: prediction.predictedHours,
            risk_level: prediction.riskLevel,
            confidence: prediction.confidence,
            category: d.category,
            freshness_score: d.freshness_score,
            expiry_hours: d.expiry_hours,
          },
          p_donation_id: d.id,
        });
      }
    }

    // Save summary output
    await supabase.rpc('save_agent_output', {
      p_agent_type: 'expiry_prediction',
      p_severity: criticalCount > 0 ? 'critical' : warningCount > 0 ? 'warning' : 'info',
      p_title: `Expiry scan complete: ${criticalCount} critical, ${warningCount} warning, ${safeCount} safe`,
      p_summary: `Scanned ${donations?.length || 0} available donations. ${criticalCount} at critical risk (≤2h), ${warningCount} at warning (≤4h), ${safeCount} safe.`,
      p_output: {
        scanned: donations?.length || 0,
        critical: criticalCount,
        warning: warningCount,
        safe: safeCount,
        predictions: predictions.slice(0, 10),
      },
    });

    return new Response(JSON.stringify({
      success: true,
      agent: 'expiry_prediction',
      scanned: donations?.length || 0,
      critical: criticalCount,
      warning: warningCount,
      safe: safeCount,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
