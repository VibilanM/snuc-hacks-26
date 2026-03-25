const BASE = '/api';

async function post(path: string, body: Record<string, unknown> = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export type StepCallback = (step: number, label: string) => void;

export async function runPipeline(
  organisationName: string,
  industry: string,
  product: string,
  onStep: StepCallback
) {
  onStep(1, 'Validating input...');
  await post('/input', { organisationName, industry, product });

  onStep(2, 'Searching for competitors...');
  const searchResult = await post('/search', { organisationName, industry, product });

  onStep(3, 'Scraping competitor data...');
  await post('/scrape-data');

  onStep(4, 'Normalizing & computing trends...');
  await post('/normalize-data');

  onStep(5, 'Creating snapshots...');
  await post('/snapshots/create');

  onStep(6, 'Detecting changes...');
  const changesResult = await post('/changes/detect');

  onStep(7, 'Generating insights & recommendations...');
  const insightsResult = await post('/insights/generate');

  return { searchResult, changesResult, insightsResult };
}

export async function fetchCompetitors() {
  const res = await fetch(`${BASE}/search`, { method: 'GET' }).catch(() => null);
  return null;
}

export async function fetchFromSupabase(table: string) {
  return null;
}
