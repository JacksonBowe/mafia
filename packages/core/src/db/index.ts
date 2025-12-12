import { neonConfig, Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Resource } from 'sst';
import ws from 'ws';
export { eq } from 'drizzle-orm';
export { migrate } from 'drizzle-orm/neon-serverless/migrator';

neonConfig.webSocketConstructor = ws;


// Use a global cache to persist the pool across Lambda container reuse
const globalForDb = globalThis as unknown as {
	__pool?: Pool;
	__db?: ReturnType<typeof drizzle>;
};

if (!globalForDb.__pool) {
	const pool = new Pool({
		connectionString: Resource.NeonDatabaseUrl.value,
	});
	globalForDb.__pool = pool;
	globalForDb.__db = drizzle({ client: pool });
}

export const db = globalForDb.__db!;

export async function closeDb() {
	await globalForDb.__pool?.end();   // closes WS connections
}