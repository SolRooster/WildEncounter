/**
 * Submits the application via the Cloudflare Worker proxy.
 *
 * The Worker URL is public (safe to expose). It holds the real
 * Discord webhook URL as an encrypted secret, so the actual webhook
 * never appears in the client bundle.
 *
 * Override at build time via VITE_WORKER_URL if needed.
 */
const WORKER_URL = import.meta.env.VITE_WORKER_URL
  || 'https://wild-encounter-webhook.roster-support.workers.dev/';

// Kept as a named export so legacy code paths (e.g., the test-mode banner)
// can detect that submission is configured.
export const WEBHOOK_URL = WORKER_URL;

/**
 * POST the application to the Worker, which forwards to Discord.
 * Returns { ok: boolean, error?: string }.
 */
export async function submitApplication(applicant, answers) {
  try {
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicant,
        answers,
        hp: '', // honeypot field — must stay empty (real users won't fill it)
      }),
    });

    if (!res.ok) {
      let detail = '';
      try {
        const body = await res.json();
        detail = body.error || JSON.stringify(body);
      } catch {
        detail = await res.text();
      }
      return { ok: false, error: `Server ${res.status}: ${detail.slice(0, 200)}` };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
