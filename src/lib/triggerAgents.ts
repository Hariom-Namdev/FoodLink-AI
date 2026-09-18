// Triggers AI analysis edge functions after lifecycle events.
// Different agents fire at different lifecycle stages:
//   - Creation: Donation Matching, Expiry Prediction, Fraud Detection
//   - Claim/Pickup: Route Optimization, Impact Analytics
//   - Delivery: Impact Analytics

const CREATION_SLUGS = [
  'smart-donation-agent',
  'expiry-prediction-agent',
  'fraud-detection-agent',
] as const;

const POST_CLAIM_SLUGS = [
  'route-optimization-agent',
  'impact-analytics-agent',
] as const;

function getHeaders(): HeadersInit {
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${anonKey}`,
  };
}

function getUrl(slug: string): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/functions/v1/${slug}`;
}

// Fire agents that analyze newly listed donations: matching, expiry, fraud
export async function triggerCreationAgents(donationId: string): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return;

  const body = JSON.stringify({ donation_id: donationId });

  await Promise.allSettled(
    CREATION_SLUGS.map((slug) =>
      fetch(getUrl(slug), { method: 'POST', headers: getHeaders(), body }).catch(() => {}),
    ),
  );
}

// Fire agents that process claimed/picked/delivered donations: route, impact
export async function triggerPostClaimAgents(donationId: string): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return;

  const body = JSON.stringify({ donation_id: donationId });

  await Promise.allSettled(
    POST_CLAIM_SLUGS.map((slug) =>
      fetch(getUrl(slug), { method: 'POST', headers: getHeaders(), body }).catch(() => {}),
    ),
  );
}

// Fire all 5 agents for a specific donation (used for manual refresh)
export async function triggerAllAgents(donationId: string): Promise<void> {
  await Promise.allSettled([
    triggerCreationAgents(donationId),
    triggerPostClaimAgents(donationId),
  ]);
}
