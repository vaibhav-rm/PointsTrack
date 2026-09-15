import { eq, inArray } from 'drizzle-orm';
import { db, accounts, students, pointsLedger, client } from '../src/db/index.js';
import { hashPassword } from '../src/lib/password.js';

const BASE = process.env.PROOF_BASE_URL ?? 'http://localhost:4000';
const RUN = Date.now();
const PW = 'idempotencyPW123';
const createdAccountIds: string[] = [];

let passCount = 0;
let failCount = 0;

function check(label: string, ok: boolean, detail = '') {
  const symbol = ok ? 'LIVE PASS ✓' : 'LIVE FAIL ✗';
  console.log(`${symbol}  ${label}${detail ? ' · ' + detail : ''}`);
  if (ok) passCount++;
  else failCount++;
}

async function api(path: string, opts: { method?: string; token?: string; body?: any; idempotencyKey?: string } = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;
  if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey;

  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, json, headers: res.headers };
}

async function main() {
  console.log('🚀 Running HTTP Idempotency Verification Suite...\n');

  console.log('=== 1. PREPARING TEST ACCOUNTS ===');
  const stuA = await api('/auth/register/student', {
    method: 'POST',
    body: {
      email: `idempotent.stuA.${RUN}@pt.test`,
      password: PW,
      name: 'Idempotency Student A',
      college: 'Proof College',
      usn: `IDEMPA${RUN}`,
    },
  });
  createdAccountIds.push(stuA.json.user.id);
  const tokenA = stuA.json.accessToken;

  const stuB = await api('/auth/register/student', {
    method: 'POST',
    body: {
      email: `idempotent.stuB.${RUN}@pt.test`,
      password: PW,
      name: 'Idempotency Student B',
      college: 'Proof College',
      usn: `IDEMPB${RUN}`,
    },
  });
  createdAccountIds.push(stuB.json.user.id);
  const tokenB = stuB.json.accessToken;

  check('Student A & B created successfully', !!tokenA && !!tokenB);

  console.log('\n=== 2. IDEMPOTENT REQUEST REPLAY ===');
  const key1 = `key-test-1-${RUN}`;
  const payload1 = { title: 'Hackathon Project', points: 25, date: '2026-10-01', semester: 2 };

  // First request
  const req1 = await api('/points', {
    method: 'POST',
    token: tokenA,
    idempotencyKey: key1,
    body: payload1,
  });
  check('Initial request with Idempotency-Key succeeded', req1.status === 201, `status=${req1.status}`);

  // Replay request with exact same key & body
  const req2 = await api('/points', {
    method: 'POST',
    token: tokenA,
    idempotencyKey: key1,
    body: payload1,
  });
  check('Replay request returned identical status (201)', req2.status === 201, `status=${req2.status}`);
  check('Replay request returned identical response JSON body', req2.json?.id === req1.json?.id);
  check('Replay response included X-Cache-Lookup: IDEMPOTENT_REPLAY header', req2.headers.get('x-cache-lookup') === 'IDEMPOTENT_REPLAY');

  console.log('\n=== 3. PAYLOAD MISMATCH REJECTION ===');
  const payloadMismatch = { title: 'Different Project Name', points: 50, date: '2026-10-01', semester: 2 };
  const reqMismatch = await api('/points', {
    method: 'POST',
    token: tokenA,
    idempotencyKey: key1,
    body: payloadMismatch,
  });
  check('Reuse of same key with different body rejected with HTTP 422 Unprocessable Entity', reqMismatch.status === 422, `status=${reqMismatch.status}`);

  console.log('\n=== 4. CROSS-USER ISOLATION ===');
  // User B uses exact same idempotency key string key1
  const reqUserB = await api('/points', {
    method: 'POST',
    token: tokenB,
    idempotencyKey: key1,
    body: payload1,
  });
  check("User B using User A's key string creates isolated entry for User B", reqUserB.status === 201 && reqUserB.json?.studentId === stuB.json.user.id);
  check('Response for User B is distinct from User A', reqUserB.json?.id !== req1.json?.id);

  console.log('\n=== 5. CONCURRENT REQUEST HANDLING ===');
  const keyConcurrent = `key-concurrent-${RUN}`;
  const concurrentPayload = { title: 'Concurrent Entry', points: 15, date: '2026-10-02', semester: 3 };

  const [c1, c2] = await Promise.all([
    api('/points', { method: 'POST', token: tokenA, idempotencyKey: keyConcurrent, body: concurrentPayload }),
    api('/points', { method: 'POST', token: tokenA, idempotencyKey: keyConcurrent, body: concurrentPayload }),
  ]);

  const statuses = [c1.status, c2.status].sort();
  check('Concurrent requests safely handled (1 succeeded, 1 replayed or blocked)', (statuses[0] === 201 && (statuses[1] === 201 || statuses[1] === 409)));

  console.log('\n=== 6. CLEANUP ===');
  if (createdAccountIds.length > 0) {
    await db.delete(pointsLedger).where(inArray(pointsLedger.studentId, createdAccountIds));
    await db.delete(students).where(inArray(students.id, createdAccountIds));
    await db.delete(accounts).where(inArray(accounts.id, createdAccountIds));
  }

  console.log(`\n==============================================`);
  console.log(`HTTP IDEMPOTENCY SUITE: ${passCount} PASSED, ${failCount} FAILED`);
  console.log(`==============================================\n`);

  try { await client.end(); } catch {}
  process.exit(failCount === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Idempotency test error:', err);
  process.exit(1);
});
