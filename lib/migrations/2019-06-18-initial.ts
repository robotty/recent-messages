import { ClientBase } from "pg";

export async function up(db: ClientBase): Promise<void> {
  await db.query(`
      CREATE TABLE channel
      (
          channel_name TEXT PRIMARY KEY         NOT NULL,
          ignored      BOOLEAN                  NOT NULL DEFAULT FALSE,
          last_access  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      )
  `);
}
