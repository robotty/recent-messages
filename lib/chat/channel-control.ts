import { ChatClient, ignoreErrors } from "dank-twitch-irc";

import * as debugLogger from "debug-logger";
import { Duration } from "moment";
import * as moment from "moment";
import { Counter, Registry } from "prom-client";
import { ChannelStorage } from "../data/channel-storage";
import { MessageStorage } from "../data/message-storage";

const log = debugLogger("recent-messages:irc:channels");

export async function startChannelControl(
  chatClient: ChatClient,
  channelStorage: ChannelStorage,
  messageStorage: MessageStorage,
  messageExpiry: Duration,
  registry: Registry
): Promise<void> {
  const channels = await channelStorage.getChannelsToJoin();
  log.info("Started IRC Client, joining %s channels", channels.length);
  chatClient.joinAll(channels);

  const runInterval = moment.duration(30, "minutes");

  const vacuumCounter = new Counter({
    name: "recent_messages_messages_vacuumed",
    help: "Messages deleted by vacuum",
    registers: [registry]
  });

  const vacuumRunCounter = new Counter({
    name: "recent_messages_message_vacuum_runs",
    help: "Channels checked for expired messages",
    registers: [registry]
  });

  const intervalCallback = (): void => {
    vacuumChannels(chatClient, channelStorage, messageStorage);
    vacuumMessages(
      messageStorage,
      messageExpiry,
      runInterval,
      vacuumCounter,
      vacuumRunCounter
    );
  };

  setInterval(intervalCallback, runInterval.asMilliseconds()); // every 30 minutes
  intervalCallback();
}

async function vacuumChannels(
  chatClient: ChatClient,
  channelStorage: ChannelStorage,
  messageStorage: MessageStorage
): Promise<void> {
  const channelsToPart = await channelStorage.channelsToVacuum();

  log.info(`Vacuuming ${channelsToPart.length} old channels`);

  for (const channel of channelsToPart) {
    chatClient.part(channel).catch(ignoreErrors);

    messageStorage
      .deleteMessages(channel)
      .catch(e =>
        log.warn("Failed to delete old messages of channel", channel, e)
      );
  }
}

async function vacuumMessages(
  messageStorage: MessageStorage,
  expiry: Duration,
  runInterval: Duration,
  counter: Counter<string>,
  runCounter: Counter<string>
): Promise<void> {
  const channelNames = await messageStorage.listChannelsWithMessages();
  const delayBetweenSteps = runInterval.asMilliseconds() / channelNames.length;

  let delay = 0;

  for (const channelName of channelNames) {
    setTimeout(async () => {
      const now = Date.now();
      const deleteBefore = now - expiry.asMilliseconds();
      const trimmed = await messageStorage.trimExpiredMessages(
        channelName,
        deleteBefore
      );
      counter.inc(trimmed);
      runCounter.inc();
    }, delay);

    delay += delayBetweenSteps;
  }
}
