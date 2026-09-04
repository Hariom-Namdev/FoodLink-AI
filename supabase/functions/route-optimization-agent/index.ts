// Route Optimization Agent
// Analyzes claimed donations and their matched NGOs, computes optimal
// pickup routes using nearest-neighbor heuristic, and suggests the most
// efficient delivery sequence. Writes results to agent_outputs.
//
// Real-world responsibility: minimize travel distance and time for
// volunteers/drivers picking up food from restaurants and delivering to NGOs.

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

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Fetch all claimed donations with NGO info
    const { data: claims, error } = await supabase
      .from('claims')
      .select(`
        id, donation_id, ngo_id,
        donation:donations ( id, food_item, restaurant_name, city, lat, lng, meals, expiry_hours ),
        ngo:ngos ( id, name, city, lat, lng )
      `)
      .order('created_at', 'desc')
      .limit(30);

    if (error) throw error;

    if (!claims || claims.length === 0) {
      await supabase.rpc('save_agent_output', {
        p_agent_type: 'route_optimization',
        p_severity: 'info',
        p_title: 'No active deliveries to optimize',
        p_summary: 'There are currently no claimed donations awaiting pickup/delivery. Route optimization will run when deliveries are active.',
        p_output: { active_deliveries: 0 },
      });

      return new Response(JSON.stringify({
        success: true,
        agent: 'route_optimization',
        routes: [],
        message: 'No active deliveries',
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group by city for local route optimization
    const cityGroups: Record<string, any[]> = {};
    for (const c of claims as any[]) {
      if (!c.donation || !c.ngo) continue;
      const city = c.donation.city || 'Unknown';
      if (!cityGroups[city]) cityGroups[city] = [];
      cityGroups[city].push(c);
    }

    // If no valid claims with both donation and NGO, save a no-op output
    if (Object.keys(cityGroups).length === 0) {
      const { error: rpcErr } = await supabase.rpc('save_agent_output', {
        p_agent_type: 'route_optimization',
        p_severity: 'info',
        p_title: 'No active deliveries to optimize',
        p_summary: 'There are currently no claimed donations with valid pickup and delivery locations. Route optimization will run when deliveries are active.',
        p_output: { active_deliveries: 0, reason: 'no_valid_claims' },
      });
      if (rpcErr) console.error('save_agent_output error:', rpcErr);

      return new Response(JSON.stringify({
        success: true,
        agent: 'route_optimization',
        routes: [],
        total_deliveries: 0,
        total_distance_km: 0,
        message: 'No active deliveries with valid locations',
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const routes: any[] = [];
    let totalDistance = 0;
    let totalOptimized = 0;

    for (const [city, cityClaims] of Object.entries(cityGroups)) {
      // Nearest-neighbor TSP heuristic
      // Start from first donation, go to its NGO, then nearest unvisited donation, etc.
      const unvisited = [...cityClaims];
      const route: any[] = [];
      let currentLat: number | null = null;
      let currentLng: number | null = null;
      let routeDistance = 0;

      while (unvisited.length > 0) {
        // Find nearest unvisited donation pickup
        let nearestIdx = 0;
        let nearestDist = Infinity;
        if (currentLat !== null && currentLng !== null) {
          for (let i = 0; i < unvisited.length; i++) {
            const d = unvisited[i].donation;
            if (d.lat && d.lng) {
              const dist = haversineKm(currentLat, currentLng, parseFloat(d.lat), parseFloat(d.lng));
              if (dist < nearestDist) {
                nearestDist = dist;
                nearestIdx = i;
              }
            }
          }
        }

        const claim = unvisited.splice(nearestIdx, 1)[0];
        const dLat = parseFloat(claim.donation.lat) || 0;
        const dLng = parseFloat(claim.donation.lng) || 0;

        // Travel to donation pickup
        if (currentLat !== null) {
          routeDistance += haversineKm(currentLat, currentLng, dLat, dLng);
        }
        currentLat = dLat;
        currentLng = dLng;

        route.push({
          type: 'pickup',
          donation_id: claim.donation_id,
          food_item: claim.donation.food_item,
          restaurant_name: claim.donation.restaurant_name,
          lat: dLat,
          lng: dLng,
          meals: claim.donation.meals,
        });

        // Travel to NGO delivery
        const nLat = parseFloat(claim.ngo.lat) || 0;
        const nLng = parseFloat(claim.ngo.lng) || 0;
        routeDistance += haversineKm(currentLat, currentLng, nLat, nLng);
        currentLat = nLat;
        currentLng = nLng;

        route.push({
          type: 'delivery',
          ngo_id: claim.ngo_id,
          ngo_name: claim.ngo.name,
          lat: nLat,
          lng: nLng,
          meals: claim.donation.meals,
        });
      }

      totalDistance += routeDistance;
      totalOptimized += cityClaims.length;

      routes.push({
        city,
        stops: route,
        total_distance_km: Math.round(routeDistance * 10) / 10,
        estimated_time_min: Math.round(routeDistance * 3), // ~3 min/km avg urban
        deliveries: cityClaims.length,
      });

      const { error: rpcErr } = await supabase.rpc('save_agent_output', {
        p_agent_type: 'route_optimization',
        p_severity: 'info',
        p_title: `Optimized route for ${city}: ${cityClaims.length} deliveries, ${Math.round(routeDistance * 10) / 10} km`,
        p_summary: `Nearest-neighbor route with ${route.length} stops (${cityClaims.length} pickups + ${cityClaims.length} deliveries). Estimated ${Math.round(routeDistance * 3)} min travel time.`,
        p_output: {
          city,
          stops: route,
          total_distance_km: Math.round(routeDistance * 10) / 10,
          estimated_time_min: Math.round(routeDistance * 3),
          deliveries: cityClaims.length,
        },
      });
      if (rpcErr) console.error('save_agent_output error:', rpcErr);
    }

    return new Response(JSON.stringify({
      success: true,
      agent: 'route_optimization',
      routes,
      total_deliveries: totalOptimized,
      total_distance_km: Math.round(totalDistance * 10) / 10,
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
