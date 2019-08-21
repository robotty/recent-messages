import { Duration } from "moment";
import { ClientBase, Pool, PoolClient, QueryConfig } from "pg";

/**
 * Double-precision seconds since UTC epoch.
 */
export type ServerTimestamp = number;

async function queryServerTimestamp(
  conn: ClientBase
): Promise<ServerTimestamp> {
  const result = await conn.query({
    name: "get-server-timestamp",
    text: "SELECT extract(epoch from now()) AS server_timestamp"
  });

  return result.rows[0].server_timestamp;
}

async function transaction<T>(
  db: Pool,
  cb: (db: ClientBase) => Promise<T>
): Promise<T> {
  const conn: PoolClient = await db.connect();

  try {
    await conn.query("BEGIN TRANSACTION");
    const result = await cb(conn);
    await conn.query("COMMIT");
    return result;
  } catch (e) {
    await conn.query("ROLLBACK");
    throw e;
  } finally {
    conn.release();
  }
}

export class ChannelStorage {
  private readonly db: Pool;
  private readonly channelExpiry: Duration;

  public constructor(db: Pool, channelExpiry: Duration) {
    this.db = db;
    this.channelExpiry = channelExpiry;
  }

  public async getChannelsToJoin(): Promise<[string[], ServerTimestamp]> {
    return await transaction(this.db, async conn => {
      const serverTimestamp = await queryServerTimestamp(conn);

      const result = await conn.query({
        name: "channels-to-join",
        text: `
                    SELECT channel_name
                    FROM channel
                    WHERE NOT ignored
                      AND NOT now() - last_access >= make_interval(secs => $1)
                `,
        // asSeconds() returns double-precision seconds
        values: [this.channelExpiry.asSeconds()]
      });
      return [result.rows.map(row => row.channel_name), serverTimestamp];
    });
  }

  public async touchOrAdd(channel: string): Promise<boolean> {
    return await this.queryAffectedRows({
      name: "insert-channel-if-not-exists",
      text: `
                INSERT INTO channel (channel_name)
                VALUES ($1)
                ON CONFLICT ON CONSTRAINT channel_pkey DO UPDATE
                    SET last_access = now()
            `,
      values: [channel]
    });
  }

  public async ignoreChannel(channel: string): Promise<boolean> {
    return await this.queryAffectedRows({
      name: "ignore-channel",
      text: `
                INSERT INTO channel (channel_name, ignored)
                VALUES ($1, TRUE)
                ON CONFLICT ON CONSTRAINT channel_pkey DO UPDATE
                    SET ignored = TRUE
            `,
      values: [channel]
    });
  }

  public async channelsToPart(
    lastQuery: ServerTimestamp
  ): Promise<[string[], ServerTimestamp]> {
    return await transaction(this.db, async conn => {
      const newTimestamp = await queryServerTimestamp(conn);

      const result = await conn.query({
        name: "channels-to-part",
        text: `
                    SELECT channel_name
                    FROM channel
                    WHERE NOT ignored
                      AND to_timestamp($1) - last_access < make_interval(secs => $2)
                      AND now() - last_access >= make_interval(secs => $2)
                `,
        // asSeconds() returns double-precision seconds
        values: [lastQuery, this.channelExpiry.asSeconds()]
      });
      return [result.rows.map(row => row.channel_name), newTimestamp];
    });
  }

  private async queryAffectedRows(queryConfig: QueryConfig): Promise<boolean> {
    const result = await this.db.query(queryConfig);
    return result.rowCount > 0;
  }
}
