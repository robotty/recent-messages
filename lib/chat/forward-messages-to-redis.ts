import { ChatClient } from "dank-twitch-irc";
import { ChannelIRCMessage } from "dank-twitch-irc/dist/message/irc/channel-irc-message";
import * as debugLogger from "debug-logger";
import { MessageStorage } from "../data/message-storage";

const log = debugLogger("recent-messages:irc:messages");

export function forwardMessagesToRedis(
  client: ChatClient,
  messageStorage: MessageStorage
): void {
  client.on("message", msg => {
    if (!(msg instanceof ChannelIRCMessage)) {
      return;
    }

    messageStorage.appendMessage(msg.channelName, msg.rawSource).catch(e => {
      log.warn("Error appending message to redis", e);
    });
  });
}
