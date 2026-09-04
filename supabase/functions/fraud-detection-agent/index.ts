// Fraud Detection Agent
// Scans donations for suspicious patterns: duplicate listings, unrealistic
// quantities, suspicious freshness scores, rapid re-listing, and quantity
// mismatches. Writes flagged donations to agent_outputs.
//
// Real-world responsibility: maintain platform integrity by detecting
// potentially fraudulent or erroneous donations before they reach NGOs.

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Fetch recent donations for analysis
    const { data: donations, error } = await supabase
      .from('donations')
      .select('id, food_item, restaurant_name, restaurant_id, category, quantity, meals, freshness_score, expiry_hours, city, status, created_at')
      .order('created_at', 'desc')
      .limit(100);

    if (error) throw error;

    const flags: any[] = [];
    let suspiciousCount = 0;
    let criticalCount = 0;

    const seenByRestaurant: Record<string, any[]> = {};

    for (const d of donations || []) {
      const issues: string[] = [];
      let severity = 'info';

      // Check 1: Unrealistic quantity (over 5000 servings)
      if (d.quantity > 5000) {
        issues.push('Unrealistic quantity (>5000 servings)');
        severity = 'warning';
      }

      // Check 2: Meals > quantity (shouldn't be more than servings)
      if (d.meals > d.quantity * 2) {
        issues.push(`Meals (${d.meals}) significantly exceed quantity (${d.quantity})`);
        severity = 'warning';
      }

      // Check 3: Freshness score mismatch with expiry
      if (d.expiry_hours <= 2 && d.freshness_score > 90) {
        issues.push(`Freshness score (${d.freshness_score}) too high for ${d.expiry_hours}h expiry`);
        severity = 'warning';
      }

      // Check 4: Freshness score of 100 (suspiciously perfect)
      if (d.freshness_score === 100) {
        issues.push('Freshness score is exactly 100 (suspiciously perfect)');
        severity = 'info';
      }

      // Check 5: Zero or negative quantity
      if (d.quantity <= 0) {
        issues.push('Zero or negative quantity');
        severity = 'critical';
      }

      // Check 6: Duplicate listing detection (same food + restaurant within 1 hour)
      const key = `${d.restaurant_id}_${d.food_item}`;
      if (!seenByRestaurant[key]) seenByRestaurant[key] = [];
      const now = new Date(d.created_at).getTime();
      const duplicates = seenByRestaurant[key].filter(prev =>
        Math.abs(new Date(prev.created_at).getTime() - now) < 3600000 // 1 hour
      );
      if (duplicates.length > 0) {
        issues.push(`Duplicate listing: same food item from same restaurant within 1 hour (${duplicates.length} prior listings)`);
        severity = 'critical';
      }
      seenByRestaurant[key].push(d);

      if (issues.length > 0) {
        flags.push({
          donation_id: d.id,
          food_item: d.food_item,
          restaurant_name: d.restaurant_name,
          city: d.city,
          status: d.status,
          issues,
          severity,
        });

        if (severity === 'critical') criticalCount++;
        else if (severity === 'warning') suspiciousCount++;

        await supabase.rpc('save_agent_output', {
          p_agent_type: 'fraud_detection',
          p_severity,
          p_title: `${d.food_item} from ${d.restaurant_name} — ${issues.length} flag(s): ${issues[0]}`,
          p_summary: `Donation flagged with ${issues.length} issue(s): ${issues.join('; ')}`,
          p_output: {
            issues,
            quantity: d.quantity,
            meals: d.meals,
            freshness_score: d.freshness_score,
            expiry_hours: d.expiry_hours,
            category: d.category,
          },
          p_donation_id: d.id,
        });
      }
    }

    // Save summary
    await supabase.rpc('save_agent_output', {
      p_agent_type: 'fraud_detection',
      p_severity: criticalCount > 0 ? 'critical' : suspiciousCount > 0 ? 'warning' : 'success',
      p_title: `Fraud scan complete: ${criticalCount} critical, ${suspiciousCount} suspicious, ${donations!.length - flags.length} clean`,
      p_summary: `Scanned ${donations?.length || 0} donations. ${flags.length} flagged (${criticalCount} critical, ${suspiciousCount} suspicious). ${donations!.length - flags.length} passed all checks.`,
      p_output: {
        scanned: donations?.length || 0,
        flagged: flags.length,
        critical: criticalCount,
        suspicious: suspiciousCount,
        clean: (donations?.length || 0) - flags.length,
        flags: flags.slice(0, 10),
      },
    });

    return new Response(JSON.stringify({
      success: true,
      agent: 'fraud_detection',
      scanned: donations?.length || 0,
      flagged: flags.length,
      critical: criticalCount,
      suspicious: suspiciousCount,
      clean: (donations?.length || 0) - flags.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : (typeof err === 'object' && err !== null ? JSON.stringify(err) : String(err));
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
