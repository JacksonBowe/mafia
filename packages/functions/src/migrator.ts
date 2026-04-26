import { db, migrate } from '@mafia/core/db';

export const handler = async () => {
	await migrate(db, { migrationsFolder: './migrations' });
};
