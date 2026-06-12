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

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET'),
    refreshSecret: required('JWT_REFRESH_SECRET'),
    accessTtl: optional('ACCESS_TOKEN_TTL', '15m'),
    refreshTtlDays: parseInt(optional('REFRESH_TOKEN_TTL_DAYS', '30'), 10),
  },

  storage: {
    // When all R2 vars are present we use R2; otherwise local disk.
    r2AccountId: optional('R2_ACCOUNT_ID'),
    r2AccessKeyId: optional('R2_ACCESS_KEY_ID'),
    r2SecretAccessKey: optional('R2_SECRET_ACCESS_KEY'),
    r2Bucket: optional('R2_BUCKET'),
    r2PublicUrl: optional('R2_PUBLIC_URL'),
  },
};

export const useR2 =
  !!env.storage.r2AccountId &&
  !!env.storage.r2AccessKeyId &&
  !!env.storage.r2SecretAccessKey &&
  !!env.storage.r2Bucket;
