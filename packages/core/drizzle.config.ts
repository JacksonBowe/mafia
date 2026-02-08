import { defineConfig } from 'drizzle-kit';
import { Resource } from 'sst';

export default defineConfig({
	dialect: 'postgresql',
	schema: ['./src/**/*.sql.ts'],
	out: './migrations',
	dbCredentials: {
		url: Resource.NeonDatabaseUrl.value,
	},
});
