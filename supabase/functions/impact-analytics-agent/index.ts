// Impact Analytics Agent
// Computes platform-wide impact metrics: total meals rescued, waste prevented,
// CO2 savings, people fed, city-wise breakdown, and trends. Writes a
// comprehensive analytics report to agent_outputs.
//
// Real-world responsibility: measure and report the real-world impact of
// the food redistribution platform for stakeholders and optimization.

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
    // Fetch all donations for analytics
    const { data: allDonations, error: dErr } = await supabase
      .from('donations')
      .select('id, food_item, category, quantity, meals, status, city, created_at, freshness_score')
      .order('created_at', 'desc')
      .limit(500);

    if (dErr) throw dErr;

    // Fetch all claims
    const { data: claims, error: cErr } = await supabase
      .from('claims')
      .select('id, donation_id, completed_at, created_at')
      .order('created_at', 'desc')
      .limit(500);

    if (cErr) throw cErr;

    // Fetch NGO count
    const { count: ngoCount } = await supabase
      .from('ngos')
      .select('*', { count: 'exact', head: true })
      .eq('verified', true);

    const donations = allDonations || [];
    const completedClaims = (claims || []).filter((c: any) => c.completed_at);

    // Core metrics
    const totalDonations = donations.length;
    const totalMealsListed = donations.reduce((s, d) => s + (d.meals || 0), 0);
    const totalMealsDelivered = donations
      .filter(d => d.status === 'delivered')
      .reduce((s, d) => s + (d.meals || 0), 0);
    const totalMealsClaimed = donations
      .filter(d => d.status === 'claimed' || d.status === 'picked' || d.status === 'delivered')
      .reduce((s, d) => s + (d.meals || 0), 0);

    // Waste prevented: ~0.4 kg per meal (avg Indian meal weight)
    const wastePreventedKg = Math.round(totalMealsDelivered * 0.4);

    // CO2 savings: ~2.5 kg CO2 per kg food waste avoided
    const co2SavedKg = Math.round(wastePreventedKg * 2.5);

    // People fed (assuming 1 meal = 1 person fed)
    const peopleFed = totalMealsDelivered;

    // Success rate
    const successRate = totalDonations > 0
      ? Math.round((donations.filter(d => d.status === 'delivered').length / totalDonations) * 100)
      : 0;

    // City-wise breakdown
    const cityStats: Record<string, { donations: number; meals: number; delivered: number }> = {};
    for (const d of donations) {
      const city = d.city || 'Unknown';
      if (!cityStats[city]) cityStats[city] = { donations: 0, meals: 0, delivered: 0 };
      cityStats[city].donations++;
      cityStats[city].meals += d.meals || 0;
      if (d.status === 'delivered') cityStats[city].delivered += d.meals || 0;
    }

    const cityBreakdown = Object.entries(cityStats)
      .map(([city, stats]) => ({ city, ...stats }))
      .sort((a, b) => b.meals - a.meals);

    // Category breakdown
    const categoryStats: Record<string, { count: number; meals: number }> = {};
    for (const d of donations) {
      const cat = d.category || 'Other';
      if (!categoryStats[cat]) categoryStats[cat] = { count: 0, meals: 0 };
      categoryStats[cat].count++;
      categoryStats[cat].meals += d.meals || 0;
    }

    const categoryBreakdown = Object.entries(categoryStats)
      .map(([category, stats]) => ({ category, ...stats }))
      .sort((a, b) => b.meals - a.meals);

    // 7-day trend
    const now = Date.now();
    const dailyTrend: { date: string; donations: number; meals: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now - i * 86400000);
      const dayEnd = new Date(now - (i - 1) * 86400000);
      const dayDonations = donations.filter(d => {
        const created = new Date(d.created_at).getTime();
        return created >= dayStart.getTime() && created < dayEnd.getTime();
      });
      dailyTrend.push({
        date: dayStart.toISOString().split('T')[0],
        donations: dayDonations.length,
        meals: dayDonations.reduce((s, d) => s + (d.meals || 0), 0),
      });
    }

    // Avg freshness of delivered donations
    const deliveredFreshness = donations.filter(d => d.status === 'delivered');
    const avgFreshness = deliveredFreshness.length > 0
      ? Math.round(deliveredFreshness.reduce((s, d) => s + (d.freshness_score || 0), 0) / deliveredFreshness.length)
      : 0;

    const report = {
      total_donations: totalDonations,
      total_meals_listed: totalMealsListed,
      total_meals_claimed: totalMealsClaimed,
      total_meals_delivered: totalMealsDelivered,
      waste_prevented_kg: wastePreventedKg,
      co2_saved_kg: co2SavedKg,
      people_fed: peopleFed,
      success_rate: successRate,
      avg_freshness_delivered: avgFreshness,
      verified_ngos: ngoCount || 0,
      active_claims: (claims || []).length - completedClaims.length,
      city_breakdown: cityBreakdown,
      category_breakdown: categoryBreakdown,
      daily_trend: dailyTrend,
    };

    await supabase.rpc('save_agent_output', {
      p_agent_type: 'impact_analytics',
      p_severity: 'info',
      p_title: `Impact report: ${totalMealsDelivered} meals delivered, ${peopleFed} people fed, ${co2SavedKg} kg CO2 saved`,
      p_summary: `${totalDonations} donations listed, ${successRate}% success rate, ${wastePreventedKg} kg food waste prevented, ${co2SavedKg} kg CO2 emissions avoided. Active in ${cityBreakdown.length} cities with ${ngoCount || 0} verified NGOs.`,
      p_output: report,
    });

    return new Response(JSON.stringify({
      success: true,
      agent: 'impact_analytics',
      ...report,
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
