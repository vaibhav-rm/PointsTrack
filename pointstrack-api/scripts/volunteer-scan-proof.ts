/** Live check of the per-event volunteer scan-token flow. */
import { inArray, eq, sql } from 'drizzle-orm';
import { db, client, accounts, pointsLedger } from '../src/db/index.js';

const BASE = 'http://localhost:4000';
const RUN = Date.now();
const ids: string[] = [];

async function api(path: string, opts: { method?: string; token?: string; body?: any } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let json: any = null; try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

async function main() {
  // organizer + two events + a student
  const org = (await api('/auth/register/organizer', { method: 'POST', body: { email: `vs.org.${RUN}@t.test`, password: 'proofpassword123', clubName: 'VS', college: 'C' } })).json;
  ids.push(org.user.id);
  const evA = (await api('/events', { method: 'POST', token: org.accessToken, body: { title: 'Event A', startDate: '2026-12-01', points: 25, openToAll: true } })).json;
  const evB = (await api('/events', { method: 'POST', token: org.accessToken, body: { title: 'Event B', startDate: '2026-12-02', points: 25, openToAll: true } })).json;
  const stu = (await api('/auth/register/student', { method: 'POST', body: { email: `vs.stu.${RUN}@t.test`, password: 'proofpassword123', name: 'Stu', college: 'C', usn: `VS${RUN}` } })).json;
  ids.push(stu.user.id);

  // organizer mints a scan token for Event A
  const mint = await api(`/events/${evA.id}/scan-token`, { method: 'POST', token: org.accessToken });
  const scanToken = mint.json.token as string;
  console.log('1. mint scan-token for Event A:', mint.status === 200 ? 'OK' : `FAIL (${mint.status})`, '· ttl', mint.json.expiresIn);

  // volunteer uses the scan token to check the student into Event A
  const checkin = await api('/attendees/checkin-by-qr', { method: 'POST', token: scanToken, body: { eventId: evA.id, studentId: stu.user.id } });
  const ledgerA = (await db.select({ c: sql<number>`count(*)::int`, pts: sql<number>`coalesce(sum(${pointsLedger.points}),0)::int` }).from(pointsLedger).where(eq(pointsLedger.eventId, evA.id)))[0];
  console.log('2. volunteer checks student into A:', checkin.status === 200 ? 'OK' : `FAIL (${checkin.status})`, `· ${checkin.json?.studentName} · ledger=${ledgerA.c} pts=${ledgerA.pts}`);

  // SAME scan token must NOT work on Event B
  const cross = await api('/attendees/checkin-by-qr', { method: 'POST', token: scanToken, body: { eventId: evB.id, studentId: stu.user.id } });
  console.log('3. same token rejected on Event B:', cross.status === 403 ? 'OK (403)' : `FAIL (${cross.status})`, '·', cross.json?.error);

  // scan token must NOT be able to do organizer things (e.g. create an event)
  const escalate = await api('/events', { method: 'POST', token: scanToken, body: { title: 'hack', startDate: '2026-12-03' } });
  console.log('4. token cannot create events:', escalate.status === 403 ? 'OK (403)' : `FAIL (${escalate.status})`, '·', escalate.json?.error);

  await db.delete(accounts).where(inArray(accounts.id, ids));
  await client.end();
}
main().catch(async (e) => { console.error(e); try { await client.end(); } catch {} process.exit(1); });
