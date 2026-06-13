import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { env } from '../config/env.js';
import * as schema from './schema.js';

// Single shared connection pool for the app. Pool size is configurable per
// environment (small instances vs. a beefy Neon/pgBouncer setup); idle and
// lifetime limits keep connections healthy and recyclable.
const client = postgres(env.databaseUrl, {
  max: env.dbPoolMax,
  idle_timeout: 20,
  max_lifetime: 60 * 30,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
export { client };
export * from './schema.js';
