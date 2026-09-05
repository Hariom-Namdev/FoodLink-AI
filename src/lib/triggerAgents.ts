// Triggers the 4 analysis edge functions (expiry, route, fraud, impact)
// after a donation is created or claimed, so their outputs land in
// agent_outputs and the Admin AI Agents panel updates in real time.

const AGENT_SLUGS = [
  'expiry-prediction-agent',
  'route-optimization-agent',
  'fraud-detection-agent',
  'impact-analytics-agent',
] as const;

export async function triggerAnalysisAgents(): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return;

  await Promise.allSettled(
    AGENT_SLUGS.map((slug) =>
      fetch(`${supabaseUrl}/functions/v1/${slug}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({}),
      }).catch(() => {
        // silent — agent will run on next cycle
      }),
    ),
  );
}
