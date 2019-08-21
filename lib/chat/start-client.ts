import { ChatClient } from "dank-twitch-irc";
import { ClientConfiguration } from "dank-twitch-irc/dist/config/config";
import { JoinError } from "dank-twitch-irc/dist/operations/join";
import * as debugLogger from "debug-logger";
import * as util from "util";

const log = debugLogger("recent-messages:irc");

export async function startChatClient(
  config: ClientConfiguration
): Promise<ChatClient> {
  const client = new ChatClient(config);

  client.on("error", e => {
    if (e instanceof JoinError) {
      log.debug("Channel %s could not be joined.", e.failedChannelName);
      return;
    }

    log.warn("IRC Client error:", util.inspect(e));
  });

  return client;
}
