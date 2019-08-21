import {
  migrateInTransaction,
  PGStorage
} from "@robotty/umzug-postgres-storage";
import * as debugLogger from "debug-logger";
import { Pool, PoolConfig } from "pg";
import * as Umzug from "umzug";

const log = debugLogger("recent-messages:db");

export async function createPoolAndRunMigrations(
  config?: PoolConfig
): Promise<Pool> {
  const pool = new Pool(config);

  const migrations = await migrateInTransaction(pool, async db => {
    const umzug = new Umzug({
      storage: new PGStorage(db),
      migrations: {
        path: "./dist/migrations",
        params: [db]
      }
    });

    return await umzug.up();
  });

  if (migrations.length > 0) {
    log.info("Successfully ran %s migrations", migrations.length);
  } else {
    log.info("No migrations to run.");
  }

  return pool;
}
