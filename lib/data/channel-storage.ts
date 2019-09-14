import { Duration } from "moment";
import { Pool, QueryConfig } from "pg";

export class ChannelStorage {
  private readonly db: Pool;
  private readonly channelExpiry: Duration;

  public constructor(db: Pool, channelExpiry: Duration) {
    this.db = db;
    this.channelExpiry = channelExpiry;
  }

  public async getChannelsToJoin(): Promise<string[]> {
    const result = await this.db.query({
      name: "channels-to-join",
      text: `
          SELECT channel_name
          FROM channel
          WHERE NOT ignored
            AND NOT now() - last_access >= make_interval(secs => $1)
          ORDER BY last_access DESC
      `,
      // asSeconds() returns double-precision seconds
      values: [this.channelExpiry.asSeconds()]
    });
    return result.rows.map(row => row.channel_name);
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

  public async isIgnored(channel: string): Promise<boolean> {
    const result = await this.db.query({
      name: "is-channel-ignored",
      text: `
        SELECT ignored FROM channel
        WHERE channel_name = $1
      `,
      values: [channel]
    });

    if (result.rows.length > 0) {
      return result.rows[0].ignored;
    } else {
      return false;
    }
  }

  public async setIgnoreStatus(
    channel: string,
    ignoreStatus: boolean
  ): Promise<boolean> {
    return await this.queryAffectedRows({
      name: "ignore-channel",
      text: `
          INSERT INTO channel (channel_name, ignored)
          VALUES ($1, $2)
          ON CONFLICT ON CONSTRAINT channel_pkey DO UPDATE
              SET ignored = $2
      `,
      values: [channel, ignoreStatus]
    });
  }

  public async channelsToVacuum(): Promise<string[]> {
    const result = await this.db.query({
      name: "vacuum-channels",
      text: `
          SELECT channel_name
          FROM channel
          WHERE ignored
            OR now() - last_access >= make_interval(secs => $1)
      `,
      // asSeconds() returns double-precision seconds
      values: [this.channelExpiry.asSeconds()]
    });
    return result.rows.map(row => row.channel_name);
  }

  private async queryAffectedRows(queryConfig: QueryConfig): Promise<boolean> {
    const result = await this.db.query(queryConfig);
    return result.rowCount > 0;
  }
}
