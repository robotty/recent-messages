import {
  ChatClient,
  ClientConfiguration,
  PrivmsgMessage,
  WhisperMessage
} from "dank-twitch-irc";
import * as debugLogger from "debug-logger";
import { ChannelStorage } from "../data/channel-storage";
import * as prettyMs from "pretty-ms";
import { MessageStorage } from "../data/message-storage";

const log = debugLogger("recent-messages:interactive-bot");

export function startInteractiveBot(
  config: ClientConfiguration,
  mainChatClient: ChatClient,
  channelStorage: ChannelStorage,
  messageStorage: MessageStorage
): void {
  const interactiveChatClient = new ChatClient(config);
  interactiveChatClient.connect();
  interactiveChatClient.on("error", e =>
    log.error("Error in interactive chat client", e)
  );
  mainChatClient.join(config.username!);

  const handleCommand = async (
    msg: PrivmsgMessage | WhisperMessage
  ): Promise<string | void> => {
    const messageSplit = msg.messageText.split(" ");

    if (messageSplit.length < 1) {
      return;
    }
    const command = messageSplit[0];

    if (command === "!ping") {
      const formattedUptime = prettyMs(process.uptime() * 1000, {
        compact: true,
        verbose: true
      });
      return `Pong! Running for ${formattedUptime}`;
    }

    if (command === "!help") {
      return (
        "I am the interactive chatbot for the recent_messages service. My commands are !ignoreme and " +
        "!addme, to ignore/re-add your own channel, respectively. SeemsGood Other commands:" +
        " !ping and !help - More about the service: https://github.com/robotty/recent-messages"
      );
    }

    if (command === "!ignoreme") {
      if (await channelStorage.isIgnored(msg.senderUsername)) {
        return "your channel is already ignored! BrokeBack Type !addme if you want to remove your ignore.";
      }

      await channelStorage.setIgnoreStatus(msg.senderUsername, true);
      await mainChatClient.part(msg.senderUsername);
      await messageStorage.deleteMessages(msg.senderUsername);
      return "the bot will now no longer listen to messages in your channel, and all message data has been deleted! SeemsGood";
    }

    if (command === "!addme") {
      if (mainChatClient.joinedChannels.has(msg.senderUsername)) {
        return "the bot is already listening in your channel! Type !removeme if you want to have your channel ignored. OpieOP";
      }

      const wasIgnored = await channelStorage.isIgnored(msg.senderUsername);
      await mainChatClient.join(msg.senderUsername);
      if (wasIgnored) {
        await channelStorage.setIgnoreStatus(msg.senderUsername, false);
        return "I am now no longer ignoring your channel, and the bot has started collecting messages in your channel again! SeemsGood";
      } else {
        return "I am now collecting messages in your channel! SeemsGood";
      }
    }
  };

  const handleEvent = (msg: PrivmsgMessage | WhisperMessage): void => {
    if (
      msg instanceof PrivmsgMessage &&
      msg.channelName !== interactiveChatClient.configuration.username
    ) {
      return;
    }

    const reply = (recipientDisplayName: string, response: string): void => {
      if (msg instanceof PrivmsgMessage) {
        // normal chat message
        interactiveChatClient
          .say(msg.channelName, `${msg.displayName}, ${response}`)
          .catch(() => {});
      } else {
        // whisper
        interactiveChatClient
          .whisper(msg.senderUsername, response)
          .catch(() => {});
      }
    };

    handleCommand(msg)
      .catch(e => {
        log.error(e);
        return "sorry, something went wrong processing your command. :/";
      })
      .then(response => {
        if (response != null) {
          reply(msg.displayName, response);
        }
      });
  };

  interactiveChatClient.on("WHISPER", handleEvent);
  mainChatClient.on("PRIVMSG", handleEvent);
}
