import { ChatClient } from "dank-twitch-irc";

import * as debugLogger from "debug-logger";
import { ChannelStorage } from "../data/channel-storage";
import { MessageStorage } from "../data/message-storage";

const log = debugLogger("recent-messages:irc:channels");

export async function startChannelControl(
  chatClient: ChatClient,
  channelStorage: ChannelStorage,
  messageStorage: MessageStorage
): Promise<void> {
  const channels = await channelStorage.getChannelsToJoin();
  log.info("Started IRC Client, joining %s channels", channels.length);
  chatClient.joinAll(channels);

  const intervalCallback = (): void => {
    vacuum(chatClient, channelStorage, messageStorage);
  };

  setInterval(intervalCallback, 30 * 60 * 1000); // every 30 minutes
  intervalCallback();
}

async function vacuum(
  chatClient: ChatClient,
  channelStorage: ChannelStorage,
  messageStorage: MessageStorage
): Promise<void> {
  const channelsToPart = await channelStorage.channelsToVacuum();

  log.info(`Vacuuming ${channelsToPart.length} old channels`);

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
}
