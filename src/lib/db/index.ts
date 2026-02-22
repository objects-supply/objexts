import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function createDbClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL environment variable is required. " +
        "Set it in your Vercel project settings or .env.local file."
    );
  }

  // For query purposes (connection pooling)
  const client = postgres(connectionString, { prepare: false });
  return drizzle(client, { schema });
}

type DbClient = ReturnType<typeof createDbClient>;

let cachedDb: DbClient | null = null;

function getDbClient(): DbClient {
  if (!cachedDb) {
    cachedDb = createDbClient();
  }
  return cachedDb;
}

// Lazy proxy prevents build-time module evaluation from failing when Next imports
// route modules to inspect config. The DATABASE_URL check still runs on first DB use.
export const db: DbClient = new Proxy({} as DbClient, {
  get(_target, prop) {
    const client = getDbClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
