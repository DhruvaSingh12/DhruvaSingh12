const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';
const TRANSIENT_STATUS = new Set([429, 500, 502, 503, 504]);

const TOKEN = process.env.ACCESS_TOKEN;
if (!TOKEN) throw new Error('ACCESS_TOKEN environment variable is required');

const HEADERS = {
  Authorization: `bearer ${TOKEN}`,
  'Content-Type': 'application/json',
  'User-Agent': 'github-stats-generator',
};

// Tracks how many API calls each function makes.
export const QUERY_COUNT: Record<string, number> = {};

export function queryCount(id: string): void {
  QUERY_COUNT[id] = (QUERY_COUNT[id] ?? 0) + 1;
}

// POST a GraphQL query to GitHub, retrying transient failures.
export async function graphql<T>(
  query: string,
  variables: Record<string, unknown> = {},
  retries = 5,
): Promise<T> {
  let delay = 2_000;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(GITHUB_GRAPHQL_URL, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ query, variables }),
      });

      if (!TRANSIENT_STATUS.has(res.status)) {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`GraphQL ${res.status}: ${text}`);
        }
        const json = (await res.json()) as { data: T; errors?: Array<{ message: string }> };
        if (json.errors?.length) {
          console.warn('GraphQL warnings:', json.errors.map((e) => e.message).join('; '));
        }
        return json.data;
      }

      // Transient — retry
      const retryAfter = res.headers.get('Retry-After');
      if (retryAfter) delay = Math.max(delay, parseInt(retryAfter, 10) * 1000);
    } catch (err) {
      if (attempt === retries - 1) throw err;
    }

    console.log(`  ↻ transient failure, retrying in ${delay / 1000}s (${attempt + 1}/${retries - 1})`);
    await new Promise((r) => setTimeout(r, delay));
    delay *= 2;
  }

  throw new Error('GraphQL request failed after all retries');
}
