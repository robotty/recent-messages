import { Redis } from "ioredis";

export interface StoredMessage {
  /**
   * UTC unix timestamp (milliseconds) of when the message was received by the service.
   */
  createTime: number;

  /**
   * Raw IRC message as it was received originally (unaltered).
   */
  message: string;
}

export interface RetrievedMessage extends StoredMessage {
  /**
   * The json source that was loaded from redis
   */
  jsonSource: string;

  /**
   * Channel name this message was sent to
   */
  channelName: string;
}

export class MessageStorage {
  public redisNamespace = "recent-messages";
  private readonly redisClient: Redis;
  private readonly bufferSize: number;

  public constructor(redisClient: Redis, bufferSize: number) {
    this.redisClient = redisClient;
    this.bufferSize = bufferSize;

    this.redisClient.defineCommand("trimExpiredMessages", {
      numberOfKeys: 1,
      lua: `
local key = KEYS[1]
local deleteBefore = tonumber(ARGV[1])

local messages = redis.call('LRANGE', key, 0, -1)

for i = #messages, 1, -1 do
    local message = cjson.decode(messages[i])

    -- if the message should be preserved
    if message['createTime'] > deleteBefore then
        local deleted_messages = #messages - i

        -- then trim messages after this one (older messages)
        if deleted_messages >= 1 then
            -- we only call redis if there is at least one message to delete
            redis.call('LTRIM', key, 0, i - 1)
        end

        return deleted_messages
    end
end

return 0`
    });
  }

  public async appendMessage(
    channelName: string,
    message: string
  ): Promise<void> {
    const value: StoredMessage = {
      createTime: Date.now(),
      message
    };

    const redisKey = this.messagesKey(channelName);

    await this.redisClient
      .multi()
      .lpush(redisKey, JSON.stringify(value))
      .ltrim(redisKey, 0, this.bufferSize - 1)
      .exec();
  }

  /**
   * Retrieve recent messages for the given channel name
   * @param channelName Channel name
   * @return An array of messages, empty array if no messages exist.
   */
  public async getMessages(channelName: string): Promise<RetrievedMessage[]> {
    const jsonMessages: string[] = await this.redisClient.lrange(
      this.messagesKey(channelName),
      0,
      -1
    );

    // in redis, the youngest message comes first (left), in all program logic we have the youngest message last.
    // -> reverse()
    jsonMessages.reverse();

    return jsonMessages.map(jsonMessage => {
      const baseObject: RetrievedMessage = JSON.parse(jsonMessage);

      // we keep the original json source so the removeMessage LREM works reliably
      baseObject.jsonSource = jsonMessage;
      baseObject.channelName = channelName;

      return baseObject;
    });
  }

  public async deleteMessages(channelName: string): Promise<void> {
    await this.redisClient.del(this.messagesKey(channelName));
  }

  public async listChannelsWithMessages(): Promise<string[]> {
    const keys = await this.redisClient.keys(this.messagesKey("*"));
    // recent-messages:v2:messages:<channelName> -> everything up to the channel name is cut away.
    const prefixLength = this.messagesKey("").length;
    return keys.map(key => key.slice(prefixLength));
  }

  public async trimExpiredMessages(
    channelName: string,
    deleteBefore: number
  ): Promise<number> {
    // @ts-ignore trimExpiredMessages does not exist on redisClient
    return await this.redisClient.trimExpiredMessages(
      this.messagesKey(channelName),
      deleteBefore
    );
  }

  private get prefix(): string {
    return `${this.redisNamespace}:v2`;
  }

  private messagesKey(channel: string): string {
    return `${this.prefix}:messages:${channel}`;
  }
}

module.exports = {
  MessageStorage
};
