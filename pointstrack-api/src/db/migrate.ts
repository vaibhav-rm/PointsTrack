import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { env } from '../config/env.js';

// Standalone migration runner (used by `npm run db:migrate`).
const migrationClient = postgres(env.databaseUrl, { max: 1 });

async function main() {
  console.log('Running migrations...');
  await migrate(drizzle(migrationClient), {
    migrationsFolder: './src/db/migrations',
  });
  console.log('Migrations complete.');
  await migrationClient.end();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
