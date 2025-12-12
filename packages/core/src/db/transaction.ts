import { PgTransaction, type PgTransactionConfig } from 'drizzle-orm/pg-core'; // Use Postgres-specific transaction types

import { db } from '.'; // Your initialized Postgres database instance
import { createContext } from '../context'; // Context management for transactions

// Define the transaction type for Postgres
// export type Transaction = PgTransaction<
// 	PgQueryResultHKT,
// 	Record<string, never>,
// 	ExtractTablesWithRelations<Record<string, never>>
// >;
export type Transaction = PgTransaction<any, any, any>;

// Type alias for either the Transaction or the DB instance
type TxOrDb = Transaction | typeof db;

// Create a context to manage transaction state
const TransactionContext = createContext<{
	tx: Transaction;
	effects: (() => void | Promise<void>)[];
}>();

/**
 * Executes a callback using an existing transaction if available,
 * or falls back to the default database instance if no transaction exists.
 */
export async function useTransaction<T>(callback: (trx: TxOrDb) => Promise<T>) {
	try {
		const { tx } = TransactionContext.use();
		return callback(tx); // Use the active transaction
	} catch {
		return callback(db); // Fallback to direct DB access
	}
}

/**
 * Registers an effect to be executed after the transaction commits.
 */
export async function afterTx(effect: () => any | Promise<any>) {
	try {
		const { effects } = TransactionContext.use();
		effects.push(effect); // Add effect to the transaction context
	} catch {
		await effect(); // If no active transaction, execute immediately
	}
}

/**
 * Creates a new transaction context and executes the given callback within it.
 * Optionally supports different isolation levels.
 */
export async function createTransaction<T>(
	callback: (tx: Transaction) => Promise<T>,
	isolationLevel?: PgTransactionConfig['isolationLevel'], // Postgres isolation levels
): Promise<T> {
	try {
		const { tx } = TransactionContext.use();
		return callback(tx); // Reuse the existing transaction context
	} catch {
		const effects: (() => void | Promise<void>)[] = []; // Prepare post-commit effects

		// Create a new transaction with the given isolation level
		const result = await db.transaction(
			async (tx) => {
				return TransactionContext.with({ tx, effects }, () => callback(tx));
			},
			{ isolationLevel: isolationLevel || 'read committed' }, // Default isolation level
		);

		// Run all registered effects after the transaction completes
		await Promise.all(effects.map((x) => x()));
		return result as T;
	}
}
