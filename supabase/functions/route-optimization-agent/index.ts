// Route Optimization Agent
// Computes optimal pickup/delivery routes for claimed donations.
// Accepts optional donation_id to compute route for a specific donation.
// Writes per-donation and summary results to agent_outputs.
// Uses actual lat/lng coordinates from donations and the NGO registry.
// Deletes prior route outputs for the same donation before saving fresh ones.

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

// Average urban driving speed in Indian cities: ~22 km/h
const AVG_SPEED_KMH = 22;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function etaMinutes(distanceKm: number): number {
  return Math.max(1, Math.round((distanceKm / AVG_SPEED_KMH) * 60));
}

function hasValidCoords(lat: any, lng: any): boolean {
  const nLat = parseFloat(lat);
  const nLng = parseFloat(lng);
  return !isNaN(nLat) && !isNaN(nLng) && nLat !== 0 && nLng !== 0;
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
        id, donation_id, ngo_id, ngo_registry_id, status, created_at,
        donation:donations ( id, food_item, restaurant_name, city, lat, lng, meals, expiry_hours, status ),
        profile:profiles ( id, full_name, organization, city )
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

    // Collect donation IDs for dedup — delete prior route outputs before saving fresh ones
    const donationIds = claims
      .map((c: any) => c.donation_id)
      .filter((id: string) => id);
    if (donationIds.length > 0) {
      await supabase
        .from('agent_outputs')
        .delete()
        .eq('agent_type', 'route_optimization')
        .in('donation_id', donationIds);
    }

    // Fetch NGO registry coordinates for all claims that have ngo_registry_id
    const registryIds = (claims as any[])
      .map((c: any) => c.ngo_registry_id)
      .filter((id: string) => id);
    let ngoRegistryMap: Record<string, any> = {};
    if (registryIds.length > 0) {
      const { data: ngos, error: ngoError } = await supabase
        .from('ngos')
        .select('id, name, city, lat, lng')
        .in('id', registryIds);
      if (ngoError) throw ngoError;
      if (ngos) {
        for (const n of ngos) ngoRegistryMap[n.id] = n;
      }
    }

    // Build route entries with real coordinates only
    const routeEntries: any[] = [];
    const skipped: any[] = [];

    for (const c of claims as any[]) {
      if (!c.donation) continue;

      const pickupLat = parseFloat(c.donation.lat);
      const pickupLng = parseFloat(c.donation.lng);

      // Resolve delivery coordinates: prefer NGO registry, fall back to profile
      let ngoName: string | null = null;
      let ngoCity: string | null = null;
      let deliveryLat: number | null = null;
      let deliveryLng: number | null = null;

      const ngoReg = c.ngo_registry_id ? ngoRegistryMap[c.ngo_registry_id] : null;
      if (ngoReg && hasValidCoords(ngoReg.lat, ngoReg.lng)) {
        ngoName = ngoReg.name;
        ngoCity = ngoReg.city;
        deliveryLat = parseFloat(ngoReg.lat);
        deliveryLng = parseFloat(ngoReg.lng);
      } else if (c.profile) {
        ngoName = c.profile.organization || c.profile.full_name || 'Claiming NGO';
        ngoCity = c.profile.city || c.donation.city || 'Unknown';
        // Profiles don't have lat/lng — no fallback to hardcoded city centers
      }

      const pickupValid = hasValidCoords(pickupLat, pickupLng);
      const deliveryValid = deliveryLat !== null && deliveryLng !== null;

      if (!pickupValid || !deliveryValid) {
        skipped.push({
          donation_id: c.donation_id,
          food_item: c.donation.food_item,
          reason: !pickupValid ? 'missing_pickup_coordinates' : 'missing_delivery_coordinates',
        });
        continue;
      }

      const distance = haversineKm(pickupLat, pickupLng, deliveryLat, deliveryLng);
      const eta = etaMinutes(distance);
      const city = c.donation.city || 'Unknown';

      routeEntries.push({
        donation_id: c.donation_id,
        food_item: c.donation.food_item,
        restaurant_name: c.donation.restaurant_name,
        pickup_city: city,
        pickup_lat: pickupLat,
        pickup_lng: pickupLng,
        ngo_name: ngoName!,
        ngo_city: ngoCity!,
        delivery_lat: deliveryLat,
        delivery_lng: deliveryLng,
        meals: c.donation.meals,
        distance_km: Math.round(distance * 10) / 10,
        eta_min: eta,
      });
    }

    if (routeEntries.length === 0) {
      const skipMsg = skipped.length > 0
        ? `${skipped.length} claim(s) found but all lack coordinates required for routing.`
        : 'No claims with valid coordinates found.';

      // Single output per skipped donation — no separate per-skip + summary
      for (const s of skipped) {
        await supabase.rpc('save_agent_output', {
          p_agent_type: 'route_optimization',
          p_severity: 'warning',
          p_title: `Route unavailable for ${s.food_item}`,
          p_summary: `Coordinates are missing for this donation's ${s.reason === 'missing_pickup_coordinates' ? 'pickup location' : 'delivery location'}. The route will be recalculated once location data is available.`,
          p_output: {
            route_available: false,
            reason: s.reason,
            donation_id: s.donation_id,
          },
          p_donation_id: s.donation_id,
        });
      }

      // For bulk mode (no donation_id), also save a city-level summary
      if (!donationId) {
        await supabase.rpc('save_agent_output', {
          p_agent_type: 'route_optimization',
          p_severity: 'warning',
          p_title: `Route unavailable for current deliveries`,
          p_summary: skipMsg,
          p_output: {
            route_available: false,
            reason: 'missing_coordinates',
            skipped: skipped,
            claim_count: claims.length,
          },
        });
      }

      return new Response(JSON.stringify({
        success: true, agent: 'route_optimization', routes: [],
        total_deliveries: 0, message: skipMsg,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Mixed case: some valid, some skipped — save per-skip warnings
    for (const s of skipped) {
      await supabase.rpc('save_agent_output', {
        p_agent_type: 'route_optimization',
        p_severity: 'warning',
        p_title: `Route unavailable for ${s.food_item}`,
        p_summary: `Coordinates are missing for this donation's ${s.reason === 'missing_pickup_coordinates' ? 'pickup location' : 'delivery location'}. The route will be recalculated once location data is available.`,
        p_output: {
          route_available: false,
          reason: s.reason,
          donation_id: s.donation_id,
        },
        p_donation_id: s.donation_id,
      });
    }

    // Group by city for multi-stop nearest-neighbor optimization
    const cityGroups: Record<string, any[]> = {};
    for (const entry of routeEntries) {
      const city = entry.pickup_city;
      if (!cityGroups[city]) cityGroups[city] = [];
      cityGroups[city].push(entry);
    }

    const routes: any[] = [];
    let totalDistance = 0, totalOptimized = 0;

    for (const [city, entries] of Object.entries(cityGroups)) {
      const unvisited = [...entries];
      const route: any[] = [];
      let currentLat: number | null = null, currentLng: number | null = null;
      let routeDistance = 0;

      while (unvisited.length > 0) {
        let nearestIdx = 0, nearestDist = Infinity;
        if (currentLat !== null && currentLng !== null) {
          for (let i = 0; i < unvisited.length; i++) {
            const dist = haversineKm(currentLat, currentLng, unvisited[i].pickup_lat, unvisited[i].pickup_lng);
            if (dist < nearestDist) { nearestDist = dist; nearestIdx = i; }
          }
        }

        const entry = unvisited.splice(nearestIdx, 1)[0];

        if (currentLat !== null) {
          const legDist = haversineKm(currentLat, currentLng, entry.pickup_lat, entry.pickup_lng);
          routeDistance += legDist;
        }
        currentLat = entry.pickup_lat;
        currentLng = entry.pickup_lng;

        route.push({
          type: 'pickup',
          donation_id: entry.donation_id,
          food_item: entry.food_item,
          restaurant_name: entry.restaurant_name,
          lat: entry.pickup_lat, lng: entry.pickup_lng,
          meals: entry.meals,
        });

        const deliveryDist = haversineKm(currentLat, currentLng, entry.delivery_lat, entry.delivery_lng);
        routeDistance += deliveryDist;
        currentLat = entry.delivery_lat;
        currentLng = entry.delivery_lng;

        route.push({
          type: 'delivery',
          ngo_name: entry.ngo_name,
          lat: entry.delivery_lat, lng: entry.delivery_lng,
          meals: entry.meals,
        });

        // Save per-donation route output (prior outputs already deleted above)
        await supabase.rpc('save_agent_output', {
          p_agent_type: 'route_optimization',
          p_severity: 'info',
          p_title: `Route for ${entry.food_item}: ${entry.restaurant_name} → ${entry.ngo_name}, ${entry.distance_km} km, ETA ${entry.eta_min} min`,
          p_summary: `Pickup at ${entry.restaurant_name} (${entry.pickup_city}) → Deliver to ${entry.ngo_name} (${entry.ngo_city}). Distance: ${entry.distance_km} km. Estimated travel time: ${entry.eta_min} min. Meals: ${entry.meals}.`,
          p_output: {
            pickup: {
              restaurant_name: entry.restaurant_name,
              city: entry.pickup_city,
              lat: entry.pickup_lat, lng: entry.pickup_lng,
            },
            delivery: {
              ngo_name: entry.ngo_name,
              ngo_city: entry.ngo_city,
              lat: entry.delivery_lat, lng: entry.delivery_lng,
            },
            distance_km: entry.distance_km,
            estimated_time_min: entry.eta_min,
            meals: entry.meals,
            food_item: entry.food_item,
          },
          p_donation_id: entry.donation_id,
          p_ngo_id: null,
        });
      }

      totalDistance += routeDistance;
      totalOptimized += entries.length;
      routes.push({
        city, stops: route,
        total_distance_km: Math.round(routeDistance * 10) / 10,
        estimated_time_min: etaMinutes(routeDistance),
        deliveries: entries.length,
      });

      // Save per-city summary (donation_id IS NULL so not deduped)
      await supabase.rpc('save_agent_output', {
        p_agent_type: 'route_optimization',
        p_severity: 'info',
        p_title: `Optimized route for ${city}: ${entries.length} deliveries, ${Math.round(routeDistance * 10) / 10} km`,
        p_summary: `Nearest-neighbor route with ${route.length} stops. Estimated ${etaMinutes(routeDistance)} min travel time.`,
        p_output: {
          city, stops: route,
          total_distance_km: Math.round(routeDistance * 10) / 10,
          estimated_time_min: etaMinutes(routeDistance),
          deliveries: entries.length,
        },
      });
    }

    return new Response(JSON.stringify({
      success: true, agent: 'route_optimization',
      routes, total_deliveries: totalOptimized,
      total_distance_km: Math.round(totalDistance * 10) / 10,
      skipped: skipped.length > 0 ? skipped : undefined,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

