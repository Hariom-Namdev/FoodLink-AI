// Fraud Detection Agent
// Scans donations for suspicious patterns. Accepts optional donation_id
// to scan a specific donation. Writes per-donation and summary results
// to agent_outputs.

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
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const donationId = body.donation_id || null;

    let query = supabase
      .from('donations')
      .select('id, food_item, restaurant_name, restaurant_id, category, quantity, meals, freshness_score, expiry_hours, city, status, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (donationId) {
      query = query.eq('id', donationId);
    }

    const { data: donations, error } = await query;
    if (error) throw error;

    const flags: any[] = [];
    let suspiciousCount = 0, criticalCount = 0;
    const seenByRestaurant: Record<string, any[]> = {};

    for (const d of donations || []) {
      const issues: string[] = [];
      let severity = 'success';
      let riskScore = 0;

      if (d.quantity > 5000) {
        issues.push('Unrealistic quantity (>5000 servings)');
        severity = 'warning'; riskScore += 30;
      }
      if (d.meals > d.quantity * 2) {
        issues.push(`Meals (${d.meals}) significantly exceed quantity (${d.quantity})`);
        severity = 'warning'; riskScore += 25;
      }
      if (d.expiry_hours <= 2 && d.freshness_score > 90) {
        issues.push(`Freshness score (${d.freshness_score}) too high for ${d.expiry_hours}h expiry`);
        severity = 'warning'; riskScore += 20;
      }
      if (d.freshness_score === 100) {
        issues.push('Freshness score is exactly 100 (suspiciously perfect)');
        riskScore += 10;
      }
      if (d.quantity <= 0) {
        issues.push('Zero or negative quantity');
        severity = 'critical'; riskScore += 50;
      }

      const key = `${d.restaurant_id}_${d.food_item}`;
      if (!seenByRestaurant[key]) seenByRestaurant[key] = [];
      const now = new Date(d.created_at).getTime();
      const duplicates = seenByRestaurant[key].filter(prev =>
        Math.abs(new Date(prev.created_at).getTime() - now) < 3600000
      );
      if (duplicates.length > 0) {
        issues.push(`Duplicate listing: same food from same restaurant within 1 hour (${duplicates.length} prior)`);
        severity = 'critical'; riskScore += 40;
      }
      seenByRestaurant[key].push(d);

      riskScore = Math.min(100, riskScore);
      if (issues.length === 0) severity = 'success';

      if (issues.length > 0) {
        flags.push({ donation_id: d.id, food_item: d.food_item, restaurant_name: d.restaurant_name, city: d.city, status: d.status, issues, severity, risk_score: riskScore });
        if (severity === 'critical') criticalCount++;
        else if (severity === 'warning') suspiciousCount++;
      }

      // Save per-donation output for ALL donations (including clean ones)
      await supabase.rpc('save_agent_output', {
        p_agent_type: 'fraud_detection',
        p_severity: severity,
        p_title: issues.length > 0
          ? `${d.food_item} from ${d.restaurant_name} — Risk score ${riskScore}/100: ${issues[0]}`
          : `${d.food_item} from ${d.restaurant_name} — Passed all fraud checks`,
        p_summary: issues.length > 0
          ? `Risk score: ${riskScore}/100. ${issues.length} issue(s): ${issues.join('; ')}.`
          : `Risk score: 0/100. No suspicious patterns detected. Quantity: ${d.quantity}, meals: ${d.meals}, freshness: ${d.freshness_score}, expiry: ${d.expiry_hours}h.`,
        p_output: {
          risk_score: riskScore,
          issues: issues,
          quantity: d.quantity,
          meals: d.meals,
          freshness_score: d.freshness_score,
          expiry_hours: d.expiry_hours,
          category: d.category,
          food_item: d.food_item,
          restaurant_name: d.restaurant_name,
          city: d.city,
        },
        p_donation_id: d.id,
      });
    }

    // Save summary
    const cleanCount = (donations?.length || 0) - flags.length;
    await supabase.rpc('save_agent_output', {
      p_agent_type: 'fraud_detection',
      p_severity: criticalCount > 0 ? 'critical' : suspiciousCount > 0 ? 'warning' : 'success',
      p_title: `Fraud scan: ${criticalCount} critical, ${suspiciousCount} suspicious, ${cleanCount} clean`,
      p_summary: `Scanned ${donations?.length || 0} donations. ${flags.length} flagged (${criticalCount} critical, ${suspiciousCount} suspicious). ${cleanCount} passed all checks.`,
      p_output: {
        scanned: donations?.length || 0,
        flagged: flags.length,
        critical: criticalCount,
        suspicious: suspiciousCount,
        clean: cleanCount,
        flags: flags.slice(0, 10),
      },
    });

    return new Response(JSON.stringify({
      success: true, agent: 'fraud_detection',
      scanned: donations?.length || 0, flagged: flags.length,
      critical: criticalCount, suspicious: suspiciousCount, clean: cleanCount,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
