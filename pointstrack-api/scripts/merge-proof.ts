/** Live verification of the merged account model + in-app volunteer scanning. */
import { inArray } from 'drizzle-orm';
import { db, client, accounts } from '../src/db/index.js';

const BASE = 'http://localhost:4000';
const RUN = Date.now();
const ids: string[] = [];
let pass = 0, fail = 0;

async function api(path: string, opts: { method?: string; token?: string; body?: any } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let json: any = null; try { json = await res.json(); } catch {}
  return { status: res.status, json };
}
function check(label: string, ok: boolean, detail = '') {
  console.log(`${ok ? 'PASS ✓' : 'FAIL ✗'}  ${label}${detail ? '  · ' + detail : ''}`);
  ok ? pass++ : fail++;
}

async function main() {
  // 1. Organizer registers via the (web) organizer endpoint → merged account.
  const org = (await api('/auth/register/organizer', { method: 'POST', body: { email: `m.org.${RUN}@t.test`, password: 'proofpassword123', clubName: 'Merge Club', college: 'MC', fullName: 'Owner One' } })).json;
  ids.push(org.user.id);
  check('organizer registration returns student profile + club', !!org.profile && !!org.club, `role=${org.user.role}, usn=${org.profile?.usn}`);

  // 2. Login returns both profile and club.
  const login = (await api('/auth/login', { method: 'POST', body: { email: `m.org.${RUN}@t.test`, password: 'proofpassword123' } })).json;
  check('login returns profile + club', !!login.profile && !!login.club);

  // 3. Owner (a student) can access /points (student endpoint) — merged identity.
  const pts = await api('/points', { token: org.accessToken });
  check('merged account can use student endpoints (/points)', pts.status === 200, `HTTP ${pts.status}`);

  // 4. Owner can create an event (has a club).
  const ev = (await api('/events', { method: 'POST', token: org.accessToken, body: { title: 'Merge Event', startDate: '2026-12-01', points: 30, openToAll: true } })).json;
  check('club owner can create an event', !!ev.id);

  // 5. A plain student (no club) CANNOT create an event.
  const stu1 = (await api('/auth/register/student', { method: 'POST', body: { email: `m.stu1.${RUN}@t.test`, password: 'proofpassword123', name: 'Plain Student', college: 'MC', usn: `MS1${RUN}` } })).json;
  ids.push(stu1.user.id);
  const denied = await api('/events', { method: 'POST', token: stu1.accessToken, body: { title: 'Nope', startDate: '2026-12-01' } });
  check('student without a club cannot create events', denied.status === 403, `HTTP ${denied.status}`);

  // 6. A volunteer student, assigned by USN, can scan; before assignment cannot.
  const vol = (await api('/auth/register/student', { method: 'POST', body: { email: `m.vol.${RUN}@t.test`, password: 'proofpassword123', name: 'Volunteer', college: 'MC', usn: `VOL${RUN}` } })).json;
  ids.push(vol.user.id);
  const target = (await api('/auth/register/student', { method: 'POST', body: { email: `m.tgt.${RUN}@t.test`, password: 'proofpassword123', name: 'Target', college: 'MC', usn: `TGT${RUN}` } })).json;
  ids.push(target.user.id);

  // before assignment → forbidden
  const before = await api('/attendees/checkin-by-qr', { method: 'POST', token: vol.accessToken, body: { eventId: ev.id, studentId: target.user.id } });
  check('unassigned student cannot scan', before.status === 403, `HTTP ${before.status}`);

  // scan-access reflects it
  const saBefore = (await api(`/events/${ev.id}/scan-access`, { token: vol.accessToken })).json;
  check('scan-access: unassigned canScan=false', saBefore.canScan === false);

  // owner assigns the volunteer by USN
  const assign = await api(`/events/${ev.id}/volunteers`, { method: 'POST', token: org.accessToken, body: { usn: `VOL${RUN}` } });
  check('owner assigns volunteer by USN', assign.status === 201, assign.json?.name);

  // scan-access now true
  const saAfter = (await api(`/events/${ev.id}/scan-access`, { token: vol.accessToken })).json;
  check('scan-access: assigned canScan=true', saAfter.canScan === true && saAfter.isVolunteer === true);

  // volunteer can now check the target in
  const scan = await api('/attendees/checkin-by-qr', { method: 'POST', token: vol.accessToken, body: { eventId: ev.id, studentId: target.user.id } });
  check('assigned volunteer can check a student in', scan.status === 200, scan.json?.studentName);

  // 7. owner can scan too (scan-access isOwner)
  const saOwner = (await api(`/events/${ev.id}/scan-access`, { token: org.accessToken })).json;
  check('owner scan-access isOwner=true', saOwner.isOwner === true && saOwner.canScan === true);

  // 8. a random student (not owner/volunteer) cannot scan
  const rnd = await api('/attendees/checkin-by-qr', { method: 'POST', token: stu1.accessToken, body: { eventId: ev.id, studentId: target.user.id } });
  check('non-volunteer student cannot scan', rnd.status === 403, `HTTP ${rnd.status}`);

  // 9. owner can list + remove volunteers
  const list = (await api(`/events/${ev.id}/volunteers`, { token: org.accessToken })).json;
  check('owner lists volunteers', Array.isArray(list) && list.length === 1);
  const del = await api(`/events/${ev.id}/volunteers/${vol.user.id}`, { method: 'DELETE', token: org.accessToken });
  const saRemoved = (await api(`/events/${ev.id}/scan-access`, { token: vol.accessToken })).json;
  check('removing a volunteer revokes scan access', del.status === 200 && saRemoved.canScan === false);

  console.log(`\n${pass}/${pass + fail} checks passed`);
  await db.delete(accounts).where(inArray(accounts.id, ids));
  await client.end();
  process.exit(fail ? 1 : 0);
}
main().catch(async (e) => { console.error(e); try { await client.end(); } catch {} process.exit(1); });
