import { ChannelIRCMessage, ChatClient, NoticeMessage } from "dank-twitch-irc";
import * as debugLogger from "debug-logger";
import { MessageStorage } from "../data/message-storage";

const log = debugLogger("recent-messages:irc:messages");

export function forwardMessagesToRedis(
  client: ChatClient,
  messageStorage: MessageStorage
): void {
  client.on("message", msg => {
    if ((msg as ChannelIRCMessage | NoticeMessage).channelName == null) {
      return;
    }

    messageStorage
      .appendMessage((msg as ChannelIRCMessage).channelName, msg.rawSource)
      .catch(e => {
        log.warn("Error appending message to redis", e);
      });
  });
}
