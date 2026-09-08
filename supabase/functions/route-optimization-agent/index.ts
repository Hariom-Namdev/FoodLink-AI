// Route Optimization Agent
// Computes optimal pickup/delivery routes for claimed donations.
// Accepts optional donation_id to compute route for a specific donation.
// Writes per-donation and summary results to agent_outputs.

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
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const donationId = body.donation_id || null;

    let query = supabase
      .from('claims')
      .select(`
        id, donation_id, ngo_id, status, created_at,
        donation:donations ( id, food_item, restaurant_name, city, lat, lng, meals, expiry_hours, status ),
        ngo:ngos ( id, name, city, lat, lng )
      `)
      .order('created_at', { ascending: false })
      .limit(30);

    if (donationId) {
      query = query.eq('donation_id', donationId);
    } else {
      query = query.in('status', ['claimed', 'picked']);
    }

    const { data: claims, error } = await query;
    if (error) throw error;

    if (!claims || claims.length === 0) {
      await supabase.rpc('save_agent_output', {
        p_agent_type: 'route_optimization',
        p_severity: 'info',
        p_title: 'No active deliveries to optimize',
        p_summary: 'There are currently no claimed donations awaiting pickup/delivery. Route optimization will run when deliveries are active.',
        p_output: { active_deliveries: 0 },
        p_donation_id: donationId || null,
      });

      return new Response(JSON.stringify({
        success: true, agent: 'route_optimization', routes: [], message: 'No active deliveries',
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Group by city
    const cityGroups: Record<string, any[]> = {};
    for (const c of claims as any[]) {
      if (!c.donation || !c.ngo) continue;
      const city = c.donation.city || 'Unknown';
      if (!cityGroups[city]) cityGroups[city] = [];
      cityGroups[city].push(c);
    }

    if (Object.keys(cityGroups).length === 0) {
      await supabase.rpc('save_agent_output', {
        p_agent_type: 'route_optimization',
        p_severity: 'warning',
        p_title: `Route unavailable for donation ${donationId || 'selection'}`,
        p_summary: 'A claim exists, but its pickup or delivery location is unavailable. The route will be recalculated when both locations are present.',
        p_output: {
          route_available: false,
          reason: 'missing_pickup_or_delivery_location',
          claim_count: claims.length,
          donation_id: donationId,
        },
        p_donation_id: donationId || claims[0]?.donation_id || null,
        p_ngo_id: claims[0]?.ngo_id || null,
      });

      return new Response(JSON.stringify({
        success: true, agent: 'route_optimization', routes: [],
        total_deliveries: 0, message: 'Claim found but route locations are unavailable',
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const routes: any[] = [];
    let totalDistance = 0, totalOptimized = 0;

    for (const [city, cityClaims] of Object.entries(cityGroups)) {
      const unvisited = [...cityClaims];
      const route: any[] = [];
      let currentLat: number | null = null, currentLng: number | null = null;
      let routeDistance = 0;

      while (unvisited.length > 0) {
        let nearestIdx = 0, nearestDist = Infinity;
        if (currentLat !== null && currentLng !== null) {
          for (let i = 0; i < unvisited.length; i++) {
            const d = unvisited[i].donation;
            if (d.lat && d.lng) {
              const dist = haversineKm(currentLat, currentLng, parseFloat(d.lat), parseFloat(d.lng));
              if (dist < nearestDist) { nearestDist = dist; nearestIdx = i; }
            }
          }
        }

        const claim = unvisited.splice(nearestIdx, 1)[0];
        const dLat = parseFloat(claim.donation.lat) || 0;
        const dLng = parseFloat(claim.donation.lng) || 0;

        if (currentLat !== null) {
          routeDistance += haversineKm(currentLat, currentLng, dLat, dLng);
        }
        currentLat = dLat; currentLng = dLng;

        route.push({
          type: 'pickup',
          donation_id: claim.donation_id,
          food_item: claim.donation.food_item,
          restaurant_name: claim.donation.restaurant_name,
          lat: dLat, lng: dLng,
          meals: claim.donation.meals,
        });

        const nLat = parseFloat(claim.ngo.lat) || 0;
        const nLng = parseFloat(claim.ngo.lng) || 0;
        routeDistance += haversineKm(currentLat, currentLng, nLat, nLng);
        currentLat = nLat; currentLng = nLng;

        route.push({
          type: 'delivery',
          ngo_id: claim.ngo_id,
          ngo_name: claim.ngo.name,
          lat: nLat, lng: nLng,
          meals: claim.donation.meals,
        });

        // Save per-donation route output
        const pickupToNgoDist = haversineKm(dLat, dLng, nLat, nLng);
        const etaMin = Math.round(pickupToNgoDist * 3);
        await supabase.rpc('save_agent_output', {
          p_agent_type: 'route_optimization',
          p_severity: 'info',
          p_title: `Route for ${claim.donation.food_item}: ${claim.donation.restaurant_name} → ${claim.ngo.name}, ${pickupToNgoDist.toFixed(1)} km, ETA ${etaMin} min`,
          p_summary: `Pickup at ${claim.donation.restaurant_name} (${claim.donation.city}) → Deliver to ${claim.ngo.name} (${claim.ngo.city}). Distance: ${pickupToNgoDist.toFixed(1)} km. Estimated travel time: ${etaMin} min. Meals: ${claim.donation.meals}.`,
          p_output: {
            pickup: {
              restaurant_name: claim.donation.restaurant_name,
              city: claim.donation.city,
              lat: dLat, lng: dLng,
            },
            delivery: {
              ngo_name: claim.ngo.name,
              ngo_city: claim.ngo.city,
              lat: nLat, lng: nLng,
            },
            distance_km: Math.round(pickupToNgoDist * 10) / 10,
            estimated_time_min: etaMin,
            meals: claim.donation.meals,
            food_item: claim.donation.food_item,
          },
          p_donation_id: claim.donation_id,
          p_ngo_id: claim.ngo_id,
        });
      }

      totalDistance += routeDistance;
      totalOptimized += cityClaims.length;
      routes.push({
        city, stops: route,
        total_distance_km: Math.round(routeDistance * 10) / 10,
        estimated_time_min: Math.round(routeDistance * 3),
        deliveries: cityClaims.length,
      });

      // Save per-city summary
      await supabase.rpc('save_agent_output', {
        p_agent_type: 'route_optimization',
        p_severity: 'info',
        p_title: `Optimized route for ${city}: ${cityClaims.length} deliveries, ${Math.round(routeDistance * 10) / 10} km`,
        p_summary: `Nearest-neighbor route with ${route.length} stops. Estimated ${Math.round(routeDistance * 3)} min travel time.`,
        p_output: {
          city, stops: route,
          total_distance_km: Math.round(routeDistance * 10) / 10,
          estimated_time_min: Math.round(routeDistance * 3),
          deliveries: cityClaims.length,
        },
      });
    }

    return new Response(JSON.stringify({
      success: true, agent: 'route_optimization',
      routes, total_deliveries: totalOptimized,
      total_distance_km: Math.round(totalDistance * 10) / 10,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
