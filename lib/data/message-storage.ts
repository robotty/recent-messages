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
  public bufferSize = 500;
  private readonly redisClient: Redis;

  public constructor(redisClient: Redis) {
    this.redisClient = redisClient;
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
