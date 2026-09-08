// Impact Analytics Agent
// Computes platform-wide impact metrics. Accepts optional donation_id
// to compute impact for a specific donation. Writes results to agent_outputs.

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

    const { data: allDonations, error: dErr } = await supabase
      .from('donations')
      .select('id, food_item, category, quantity, meals, status, city, created_at, freshness_score, restaurant_name')
      .order('created_at', { ascending: false })
      .limit(500);
    if (dErr) throw dErr;

    const { data: claims, error: cErr } = await supabase
      .from('claims')
      .select('id, donation_id, status, created_at')
      .order('created_at', { ascending: false })
      .limit(500);
    if (cErr) throw cErr;

    const { count: ngoCount } = await supabase
      .from('ngos')
      .select('*', { count: 'exact', head: true })
      .eq('verified', true);

    const donations = allDonations || [];
    const totalDonations = donations.length;
    const totalMealsListed = donations.reduce((s, d) => s + (d.meals || 0), 0);
    const totalMealsDelivered = donations.filter(d => d.status === 'delivered').reduce((s, d) => s + (d.meals || 0), 0);
    const totalMealsClaimed = donations.filter(d => ['claimed', 'picked', 'delivered'].includes(d.status)).reduce((s, d) => s + (d.meals || 0), 0);

    const wastePreventedKg = Math.round(totalMealsDelivered * 0.4);
    const co2SavedKg = Math.round(wastePreventedKg * 2.5);
    const peopleFed = totalMealsDelivered;
    const successRate = totalDonations > 0 ? Math.round((donations.filter(d => d.status === 'delivered').length / totalDonations) * 100) : 0;

    // City breakdown
    const cityStats: Record<string, { donations: number; meals: number; delivered: number }> = {};
    for (const d of donations) {
      const city = d.city || 'Unknown';
      if (!cityStats[city]) cityStats[city] = { donations: 0, meals: 0, delivered: 0 };
      cityStats[city].donations++;
      cityStats[city].meals += d.meals || 0;
      if (d.status === 'delivered') cityStats[city].delivered += d.meals || 0;
    }
    const cityBreakdown = Object.entries(cityStats).map(([city, s]) => ({ city, ...s })).sort((a, b) => b.meals - a.meals);

    // Category breakdown
    const catStats: Record<string, { count: number; meals: number }> = {};
    for (const d of donations) {
      const cat = d.category || 'Other';
      if (!catStats[cat]) catStats[cat] = { count: 0, meals: 0 };
      catStats[cat].count++;
      catStats[cat].meals += d.meals || 0;
    }
    const categoryBreakdown = Object.entries(catStats).map(([category, s]) => ({ category, ...s })).sort((a, b) => b.meals - a.meals);

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

    const deliveredFreshness = donations.filter(d => d.status === 'delivered');
    const avgFreshness = deliveredFreshness.length > 0
      ? Math.round(deliveredFreshness.reduce((s, d) => s + (d.freshness_score || 0), 0) / deliveredFreshness.length)
      : 0;

    const completedClaims = (claims || []).filter((c: any) => c.status === 'delivered' || c.status === 'completed');
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

    // Save summary output
    await supabase.rpc('save_agent_output', {
      p_agent_type: 'impact_analytics',
      p_severity: 'info',
      p_title: `Impact report: ${totalMealsDelivered} meals delivered, ${peopleFed} people fed, ${co2SavedKg} kg CO2 saved`,
      p_summary: `${totalDonations} donations listed, ${successRate}% success rate, ${wastePreventedKg} kg food waste prevented, ${co2SavedKg} kg CO2 emissions avoided. Active in ${cityBreakdown.length} cities with ${ngoCount || 0} verified NGOs.`,
      p_output: report,
    });

    // If donation_id provided, save per-donation impact
    if (donationId) {
      const d = donations.find(dd => dd.id === donationId);
      if (d) {
        const donationMeals = d.meals || 0;
        const donationWasteKg = Math.round(donationMeals * 0.4);
        const donationCo2Kg = Math.round(donationWasteKg * 2.5);
        const statusLabels: Record<string, string> = {
          available: 'listed and awaiting NGO match',
          claimed: 'claimed by an NGO — pickup being arranged',
          picked: 'picked up — delivery in progress',
          delivered: 'delivered — impact confirmed',
          removed: 'removed from platform',
        };
        await supabase.rpc('save_agent_output', {
          p_agent_type: 'impact_analytics',
          p_severity: d.status === 'delivered' ? 'success' : 'info',
          p_title: `${d.food_item} from ${d.restaurant_name} — ${donationMeals} meals, ${statusLabels[d.status] || d.status}`,
          p_summary: `${donationMeals} meals · ${donationWasteKg} kg waste prevented · ${donationCo2Kg} kg CO2 saved · Status: ${d.status} · City: ${d.city} · Freshness: ${d.freshness_score}%`,
          p_output: {
            food_item: d.food_item,
            restaurant_name: d.restaurant_name,
            meals: donationMeals,
            waste_prevented_kg: donationWasteKg,
            co2_saved_kg: donationCo2Kg,
            people_fed: donationMeals,
            status: d.status,
            city: d.city,
            freshness_score: d.freshness_score,
          },
          p_donation_id: d.id,
        });
      }
    }

    return new Response(JSON.stringify({
      success: true, agent: 'impact_analytics', ...report,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
