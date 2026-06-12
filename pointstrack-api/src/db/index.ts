import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { env } from '../config/env.js';
import * as schema from './schema.js';

// Single shared connection pool for the app.
const client = postgres(env.databaseUrl, { max: 10 });

export const db = drizzle(client, { schema });
export { client };
export * from './schema.js';
