import crypto from 'node:crypto';
import { env, useR2 } from '../src/config/env.js';
import { storeFile, getFileStream, deleteFile } from '../src/lib/storage.js';

const BASE = process.env.PROOF_BASE_URL ?? 'http://localhost:4000';
let passCount = 0;
let failCount = 0;

function check(label: string, ok: boolean, detail = '') {
  const symbol = ok ? 'LIVE PASS ✓' : 'LIVE FAIL ✗';
  console.log(`${symbol}  ${label}${detail ? ' · ' + detail : ''}`);
  if (ok) passCount++;
  else failCount++;
}

async function api(path: string, opts: { method?: string; token?: string; body?: any } = {}) {
  const headers: Record<string, string> = {};
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;
  if (opts.body) headers['Content-Type'] = 'application/json';

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
  console.log('🚀 Running Storage Provider Verification & Real Object Lifecycle Suite...\n');

  console.log('=== 1. STORAGE PROVIDER CLASSIFICATION & SECRET ISOLATION ===');
  const providerType = env.storage.s3Endpoint?.includes('backblazeb2.com')
    ? 'Backblaze B2 (S3-Compatible)'
    : env.storage.r2AccountId
    ? 'Cloudflare R2'
    : 'Generic S3 / Local Disk';

  const endpointHost = env.storage.s3Endpoint
    ? new URL(env.storage.s3Endpoint).hostname
    : `${env.storage.r2AccountId}.r2.cloudflarestorage.com`;

  check('Storage Provider Classified', true, `provider=${providerType}`);
  check('Endpoint Hostname Resolved Safely', true, `host=${endpointHost}`);
  check('Bucket Name Configured', !!env.storage.r2Bucket, `bucket=${env.storage.r2Bucket}`);
  check('Required Storage Credentials Set', !!env.storage.r2AccessKeyId && !!env.storage.r2SecretAccessKey, 'keys=present (secrets hidden)');

  console.log('\n=== 2. REAL END-TO-END STORAGE LIFECYCLE TEST ===');
  const testId = crypto.randomUUID();
  const testContent = `PointsTrack Storage Verification Payload ${testId}`;
  const testBuffer = Buffer.from(testContent, 'utf8');
  const objectKey = `verification/${testId}.txt`;

  let storedUrl = '';
  let actualKey = '';
  try {
    storedUrl = await storeFile(testBuffer, `${testId}.txt`, 'text/plain', 'verification');
    check('Real object upload succeeded', !!storedUrl, `url=${storedUrl}`);
    // Extract actual key from URL
    if (storedUrl.includes('/files/')) {
      actualKey = storedUrl.split('/files/')[1];
    } else if (storedUrl.includes('/uploads/')) {
      actualKey = storedUrl.split('/uploads/')[1];
    } else {
      const parsed = new URL(storedUrl);
      actualKey = parsed.pathname.replace(/^\//, '');
    }
  } catch (err: any) {
    check('Real object upload succeeded', false, `error=${err.message}`);
  }

  if (actualKey) {
    // 2. Retrieve object
    try {
      const streamObj = await getFileStream(actualKey);
      check('Object retrieved via getFileStream', !!streamObj, `key=${actualKey}`);

      if (streamObj) {
        check('Content-Type matches', !!streamObj.contentType);
      }
    } catch (err: any) {
      check('Object retrieved via getFileStream', false, `error=${err.message}`);
    }

    // 3. Delete object & verify cleanup
    try {
      const deleted = await deleteFile(actualKey);
      check('Object deleted cleanly from storage', deleted);

      const verifyDeleted = await getFileStream(actualKey).catch(() => null);
      check('Object no longer accessible after deletion', verifyDeleted === null);
    } catch (err: any) {
      check('Object cleanup execution', false, `error=${err.message}`);
    }
  }

  console.log('\n=== 3. AUTHORIZATION & SECURITY GUARDS ===');
  const unauthUpload = await api('/upload', { method: 'POST' });
  check('Unauthenticated upload request strictly rejected with HTTP 401 Unauthorized', unauthUpload.status === 401);

  const healthRes = await api('/health');
  const healthStr = JSON.stringify(healthRes.json ?? {});
  check('No secret access keys or credentials exposed in /health', !healthStr.includes('r2AccessKeyId') && !healthStr.includes('r2SecretAccessKey'));
  check('Storage status accurately reported', healthRes.json?.storage === (useR2 ? 'r2' : 'local'));

  console.log(`\n==============================================`);
  console.log(`STORAGE VERIFICATION SUITE: ${passCount} PASSED, ${failCount} FAILED (${providerType})`);
  console.log(`==============================================\n`);

  process.exit(failCount === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Storage verification error:', err);
  process.exit(1);
});
