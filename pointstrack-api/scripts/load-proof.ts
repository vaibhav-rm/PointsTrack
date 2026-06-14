/**
 * Lightweight throughput/latency probe for a paginated read endpoint.
 * Real numbers for the report — single API instance, local Postgres.
 *
 * Run:  npx tsx scripts/load-proof.ts
 */
import { inArray } from 'drizzle-orm';
import { db, client, accounts } from '../src/db/index.js';

const BASE = process.env.PROOF_BASE_URL ?? 'http://localhost:4000';
const RUN = Date.now();
const createdAccountIds: string[] = [];

async function post(path: string, body: any, token?: string) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function main() {
  const org = await post('/auth/register/organizer', {
    email: `load.org.${RUN}@proof.test`, password: 'proofpassword123',
    clubName: 'Load Club', college: 'Proof College', fullName: 'Load Org',
  });
  createdAccountIds.push(org.user.id);
  const token = org.accessToken as string;

  // Seed some events so the read does real work.
  for (let i = 0; i < 40; i++) {
    await post('/events', { title: `Load Event ${i}`, startDate: '2026-12-01', points: 10, capacity: 0, openToAll: true }, token);
  }

  const TOTAL = 2000;
  const CONCURRENCY = 50;
  const url = `${BASE}/events?college=Proof%20College&limit=50`;
  const headers = { Authorization: `Bearer ${token}` };

  const latencies: number[] = [];
  let done = 0;
  const start = Date.now();

  async function worker() {
    while (done < TOTAL) {
      done++;
      const t0 = performance.now();
      const r = await fetch(url, { headers });
      await r.arrayBuffer();
      latencies.push(performance.now() - t0);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const elapsed = (Date.now() - start) / 1000;
  latencies.sort((a, b) => a - b);
  const pct = (p: number) => latencies[Math.min(latencies.length - 1, Math.floor((p / 100) * latencies.length))];
  const mean = latencies.reduce((a, b) => a + b, 0) / latencies.length;

  const out = {
    requests: latencies.length,
    concurrency: CONCURRENCY,
    seconds: +elapsed.toFixed(2),
    throughputRps: Math.round(latencies.length / elapsed),
    latencyMs: { mean: +mean.toFixed(1), p50: +pct(50).toFixed(1), p95: +pct(95).toFixed(1), p99: +pct(99).toFixed(1), max: +latencies[latencies.length - 1].toFixed(1) },
  };

  console.log(`PointsTrack — Read throughput probe (single instance, local Postgres)`);
  console.log(`Endpoint: GET /events  (paginated, limit=50, indexed, authenticated+gzip)`);
  console.log(`Requests: ${out.requests}  Concurrency: ${out.concurrency}  Wall: ${out.seconds}s`);
  console.log(`Throughput: ${out.throughputRps} req/s`);
  console.log(`Latency ms — mean ${out.latencyMs.mean}  p50 ${out.latencyMs.p50}  p95 ${out.latencyMs.p95}  p99 ${out.latencyMs.p99}  max ${out.latencyMs.max}`);
  console.log('\n<<<LOAD_JSON>>>');
  console.log(JSON.stringify(out, null, 2));
  console.log('<<<END_LOAD_JSON>>>');

  await db.delete(accounts).where(inArray(accounts.id, createdAccountIds));
  await client.end();
}

main().catch(async (e) => { console.error(e); try { await client.end(); } catch {} process.exit(1); });
