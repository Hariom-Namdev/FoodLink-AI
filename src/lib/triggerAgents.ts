// Triggers AI analysis edge functions after lifecycle events.
// Passes donation_id so agents can produce per-donation outputs.

const ANALYSIS_SLUGS = [
  'expiry-prediction-agent',
  'fraud-detection-agent',
  'impact-analytics-agent',
] as const;

const ROUTE_SLUG = 'route-optimization-agent';

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

// Fire all 4 analysis agents for a specific donation
export async function triggerAnalysisAgents(donationId?: string): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return;

  const body = donationId ? JSON.stringify({ donation_id: donationId }) : JSON.stringify({});

  await Promise.allSettled(
    [...ANALYSIS_SLUGS, ROUTE_SLUG].map((slug) =>
      fetch(getUrl(slug), {
        method: 'POST',
        headers: getHeaders(),
        body,
      }).catch(() => {}),
    ),
  );
}

// Fire only the smart-donation-agent (matching) for a specific donation
export async function triggerMatchingAgent(): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return;

  await fetch(`${supabaseUrl}/functions/v1/smart-donation-agent`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({}),
  }).catch(() => {});
}

// Fire all 5 agents for a specific donation
export async function triggerAllAgents(donationId?: string): Promise<void> {
  await Promise.allSettled([
    triggerMatchingAgent(),
    triggerAnalysisAgents(donationId),
  ]);
}
