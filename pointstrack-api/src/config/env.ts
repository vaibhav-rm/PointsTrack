import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

export const env = {
  nodeEnv: optional('NODE_ENV', 'development'),
  isProd: optional('NODE_ENV', 'development') === 'production',
  port: parseInt(optional('PORT', '4000'), 10),
  apiUrl: optional('API_URL', 'http://localhost:4000'),
  corsOrigins: optional('CORS_ORIGINS', 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  databaseUrl: required('DATABASE_URL'),
  dbPoolMax: parseInt(optional('DB_POOL_MAX', '10'), 10),

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET'),
    refreshSecret: required('JWT_REFRESH_SECRET'),
    accessTtl: optional('ACCESS_TOKEN_TTL', '15m'),
    refreshTtlDays: parseInt(optional('REFRESH_TOKEN_TTL_DAYS', '30'), 10),
  },

  storage: {
    // S3-compatible object storage (Cloudflare R2, Supabase, Backblaze B2, MinIO…).
    // Set the access key + secret + bucket, and EITHER an R2 account id OR an
    // explicit S3_ENDPOINT. Leave all blank to fall back to local disk.
    r2AccountId: optional('R2_ACCOUNT_ID'),
    r2AccessKeyId: optional('R2_ACCESS_KEY_ID'),
    r2SecretAccessKey: optional('R2_SECRET_ACCESS_KEY'),
    r2Bucket: optional('R2_BUCKET'),
    r2PublicUrl: optional('R2_PUBLIC_URL'),
    // Explicit endpoint for non-R2 providers, e.g.
    //   https://<ref>.supabase.co/storage/v1/s3   (Supabase)
    //   https://s3.us-west-004.backblazeb2.com     (Backblaze B2)
    s3Endpoint: optional('S3_ENDPOINT'),
    s3Region: optional('S3_REGION', 'auto'),
  },
};

// Use object storage when we have credentials + a bucket + somewhere to send them
// (an explicit endpoint, or an R2 account id we can turn into one).
export const useR2 =
  !!env.storage.r2AccessKeyId &&
  !!env.storage.r2SecretAccessKey &&
  !!env.storage.r2Bucket &&
  (!!env.storage.r2AccountId || !!env.storage.s3Endpoint);
