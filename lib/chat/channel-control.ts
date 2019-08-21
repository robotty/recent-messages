import { ChatClient } from "dank-twitch-irc";
import { ChannelStorage, ServerTimestamp } from "../data/channel-storage";

import * as debugLogger from "debug-logger";
import { MessageStorage } from "../data/message-storage";

const log = debugLogger("recent-messages:irc:channels");

export async function startChannelControl(
  chatClient: ChatClient,
  channelStorage: ChannelStorage,
  messageStorage: MessageStorage
): Promise<void> {
  const [channels, initialTs] = await channelStorage.getChannelsToJoin();
  log.info("Started IRC Client, joining %s channels", channels.length);
  chatClient.joinAll(channels);

  let lastTimestamp: ServerTimestamp = initialTs;

  setInterval(async () => {
    try {
      const [channelsToPart, newTs] = await channelStorage.channelsToPart(
        lastTimestamp
      );

      log.info(
        `Parting ${channelsToPart.length} old channels:`,
        channelsToPart
      );

      for (const channel of channelsToPart) {
        chatClient
          .part(channel)
          .catch(e => log.warn("Failed to part channel", channel, e));

        messageStorage
          .deleteMessages(channel)
          .catch(e =>
            log.warn("Failed to delete old messages of channel", channel, e)
          );
      }

      lastTimestamp = newTs;
    } catch (e) {
      log.warn("Failed to run the regular auto-stagnant channel part", e);
    }
  }, 30 * 60 * 1000); // every 30 minutes
}
