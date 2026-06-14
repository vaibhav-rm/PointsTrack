/**
 * Live end-to-end concurrency proof for PointsTrack.
 *
 * Spins up real HTTP traffic against the running API (localhost:4000) and then
 * reads ground truth straight from Postgres. Nothing is mocked: the same route
 * handlers, transactions, row locks and unique indexes that run in production
 * are exercised here. Output is captured verbatim into the report/deck.
 *
 * Run:  npx tsx scripts/concurrency-proof.ts
 */
import { sql, eq, and, inArray } from 'drizzle-orm';
import { db, client, accounts, attendees, pointsLedger, eventsCatalog } from '../src/db/index.js';

const BASE = process.env.PROOF_BASE_URL ?? 'http://localhost:4000';
const RUN = Date.now(); // unique namespace so reruns never collide
const PW = 'proofpassword123';

type Json = Record<string, any>;
const createdAccountIds: string[] = [];

async function api(path: string, opts: { method?: string; token?: string; body?: Json } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty body */ }
  return { status: res.status, json };
}

async function registerOrganizer() {
  const email = `proof.org.${RUN}@proof.test`;
  const { json } = await api('/auth/register/organizer', {
    method: 'POST',
    body: { email, password: PW, clubName: 'Proof Club', college: 'Proof College', fullName: 'Proof Org' },
  });
  createdAccountIds.push(json.user.id);
  return { id: json.user.id as string, token: json.accessToken as string };
}

async function registerStudent(n: number) {
  const email = `proof.stu.${RUN}.${n}@proof.test`;
  const { json } = await api('/auth/register/student', {
    method: 'POST',
    body: { email, password: PW, name: `Proof Student ${n}`, college: 'Proof College', usn: `PROOF${RUN}${n}` },
  });
  createdAccountIds.push(json.user.id);
  return { id: json.user.id as string, token: json.accessToken as string };
}

async function createEvent(orgToken: string, capacity: number, points: number, title: string) {
  const { json } = await api('/events', {
    method: 'POST',
    token: orgToken,
    body: { title, startDate: '2026-12-01', points, capacity, openToAll: true },
  });
  return json.id as string;
}

function bar(label: string) {
  console.log('\n' + '─'.repeat(72) + '\n' + label + '\n' + '─'.repeat(72));
}
function line(k: string, v: string | number) {
  console.log(`   ${k.padEnd(46)} ${v}`);
}

async function main() {
  console.log(`PointsTrack — Live Concurrency Proof`);
  console.log(`Target: ${BASE}   Run id: ${RUN}   ${new Date().toISOString()}`);

  // Wait for the server.
  for (let i = 0; i < 30; i++) {
    try { const r = await fetch(`${BASE}/health`); if (r.ok) break; } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }

  const org = await registerOrganizer();

  const results: { scenario: string; expected: string; actual: string; pass: boolean }[] = [];

  // ───────────────────────────────────────────────────────────────────────
  // TEST 1 — Double-tap / duplicate check-in must award points exactly once.
  // 12 simultaneous QR check-ins of the SAME student on the SAME event.
  // ───────────────────────────────────────────────────────────────────────
  bar('TEST 1  ·  12 simultaneous check-ins of one attendee (double-award guard)');
  {
    const ev = await createEvent(org.token, 0, 50, `Proof T1 ${RUN}`);
    const stu = await registerStudent(1);
    await api('/attendees', { method: 'POST', token: stu.token, body: { eventId: ev } });

    const N = 12;
    const responses = await Promise.all(
      Array.from({ length: N }, () =>
        api('/attendees/checkin-by-qr', {
          method: 'POST',
          token: org.token,
          body: { eventId: ev, studentId: stu.id },
        })
      )
    );
    const ok = responses.filter((r) => r.status === 200).length;

    const [{ rows: ledgerCount }] = [
      { rows: (await db.select({ c: sql<number>`count(*)::int`, pts: sql<number>`coalesce(sum(${pointsLedger.points}),0)::int` })
          .from(pointsLedger).where(eq(pointsLedger.eventId, ev)))[0] },
    ];
    const ledgerRows = ledgerCount.c;
    const totalPts = ledgerCount.pts;

    line('Concurrent check-in requests fired', N);
    line('HTTP 200 responses', ok);
    line('points_ledger rows created', ledgerRows);
    line('Total points awarded', `${totalPts}  (naive bug would give ${50 * N})`);
    const pass = ledgerRows === 1 && totalPts === 50;
    line('RESULT', pass ? 'PASS ✓' : 'FAIL ✗');
    results.push({
      scenario: `${N} simultaneous check-ins of one attendee`,
      expected: '1 ledger row · 50 pts',
      actual: `${ledgerRows} ledger row · ${totalPts} pts`,
      pass,
    });
  }

  // ───────────────────────────────────────────────────────────────────────
  // TEST 2 — Duplicate registration race. One student applies 10x at once.
  // ───────────────────────────────────────────────────────────────────────
  bar('TEST 2  ·  10 simultaneous duplicate applications (unique-registration guard)');
  {
    const ev = await createEvent(org.token, 0, 10, `Proof T2 ${RUN}`);
    const stu = await registerStudent(2);

    const N = 10;
    const responses = await Promise.all(
      Array.from({ length: N }, () =>
        api('/attendees', { method: 'POST', token: stu.token, body: { eventId: ev } })
      )
    );
    const created = responses.filter((r) => r.status === 201).length;
    const conflicts = responses.filter((r) => r.status === 409).length;

    const cnt = (await db.select({ c: sql<number>`count(*)::int` })
      .from(attendees).where(and(eq(attendees.eventId, ev), eq(attendees.studentId, stu.id))))[0].c;

    line('Concurrent apply requests fired', N);
    line('HTTP 201 created', created);
    line('HTTP 409 conflict (rejected duplicates)', conflicts);
    line('attendees rows in DB', cnt);
    const pass = cnt === 1;
    line('RESULT', pass ? 'PASS ✓' : 'FAIL ✗');
    results.push({
      scenario: `${N} simultaneous duplicate applications`,
      expected: '1 attendee row',
      actual: `${cnt} attendee row`,
      pass,
    });
  }

  // ───────────────────────────────────────────────────────────────────────
  // TEST 3 — Capacity race. capacity=1, 6 students apply simultaneously.
  // Exactly one active seat; the rest waitlisted (no over-sell).
  // ───────────────────────────────────────────────────────────────────────
  bar('TEST 3  ·  capacity=1, 6 simultaneous applications (no over-sell guard)');
  {
    const ev = await createEvent(org.token, 1, 10, `Proof T3 ${RUN}`);
    const N = 6;
    const studs = await Promise.all(Array.from({ length: N }, (_, i) => registerStudent(100 + i)));

    await Promise.all(
      studs.map((s) => api('/attendees', { method: 'POST', token: s.token, body: { eventId: ev } }))
    );

    const breakdown = await db
      .select({ status: attendees.status, c: sql<number>`count(*)::int` })
      .from(attendees)
      .where(eq(attendees.eventId, ev))
      .groupBy(attendees.status);
    const by = Object.fromEntries(breakdown.map((b) => [b.status, b.c]));
    const active = (by['pending'] ?? 0) + (by['checked-in'] ?? 0);
    const waitlisted = by['waitlisted'] ?? 0;

    line('Event capacity', 1);
    line('Concurrent applicants', N);
    line('Active (pending/checked-in) seats taken', active);
    line('Waitlisted', waitlisted);
    const pass = active === 1 && waitlisted === N - 1;
    line('RESULT', pass ? 'PASS ✓' : 'FAIL ✗');
    results.push({
      scenario: `capacity=1, ${N} simultaneous applications`,
      expected: `1 active · ${N - 1} waitlisted`,
      actual: `${active} active · ${waitlisted} waitlisted`,
      pass,
    });
  }

  // ───────────────────────────────────────────────────────────────────────
  // Summary
  // ───────────────────────────────────────────────────────────────────────
  bar('SUMMARY');
  for (const r of results) {
    console.log(`   ${r.pass ? 'PASS ✓' : 'FAIL ✗'}  ${r.scenario}`);
    console.log(`           expected ${r.expected}  ·  got ${r.actual}`);
  }
  const allPass = results.every((r) => r.pass);
  console.log(`\n   ${results.filter((r) => r.pass).length}/${results.length} scenarios correct under concurrency — ${allPass ? 'ALL PASS' : 'FAILURES PRESENT'}`);

  // Emit machine-readable JSON for the report/deck generators.
  console.log('\n<<<PROOF_JSON>>>');
  console.log(JSON.stringify({ runAt: new Date().toISOString(), base: BASE, results, allPass }, null, 2));
  console.log('<<<END_PROOF_JSON>>>');

  // Cleanup: deleting the accounts cascades to events/attendees/ledger.
  await db.delete(accounts).where(inArray(accounts.id, createdAccountIds));
  await client.end();
  process.exit(allPass ? 0 : 1);
}

main().catch(async (err) => {
  console.error('Proof run failed:', err);
  try { await client.end(); } catch {}
  process.exit(1);
});
