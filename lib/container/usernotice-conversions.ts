import { TwitchBadge } from "dank-twitch-irc/dist/message/badge";
import { getTagString } from "dank-twitch-irc/dist/message/parser/tag-values";
import { UsernoticeMessage } from "dank-twitch-irc/dist/message/twitch-types/usernotice";
import { ContainerFrame, newFrame } from "./message-container";

export function usernoticeToPrivmsgFrames(
  msg: UsernoticeMessage
): ContainerFrame[] {
  const frames: ContainerFrame[] = [];

  if (msg.messageText != null) {
    const newBadges = [new TwitchBadge("twitchbot", "1"), ...msg.badges];

    frames.push(
      newFrame(
        `@badge-info=${msg.badgeInfoRaw};` +
          `badges=${newBadges};` +
          `color=${msg.colorRaw};` +
          `display-name=${msg.displayName};` +
          `emotes=${msg.emotesRaw};` +
          `id=${msg.messageID};` +
          `mod=${msg.isModRaw};` +
          `room-id=${msg.channelID};` +
          `subscriber=${msg.ircTags.subscriber};` +
          `tmi-sent-ts=${msg.serverTimestampRaw};` +
          `turbo=${msg.ircTags.turbo};` +
          `user-id=${msg.senderUserID};` +
          `user-type=${getTagString(msg.ircTags, "user-type")} ` +
          `:${msg.senderUsername}!${msg.senderUsername}@${msg.senderUsername}.tmi.twitch.tv PRIVMSG ` +
          `#${msg.channelName} :${msg.messageText}`
      )
    );
  }

  frames.push(
    newFrame(
      "@badge-info=;" +
        "badges=twitchbot/1;" +
        "color=#613FA0;" +
        "display-name=USERNOTICE;" +
        "emotes=;" +
        `id=${msg.messageID};` +
        "mod=0;" +
        `room-id=${msg.channelID};` +
        "subscriber=0;" +
        `tmi-sent-ts=${msg.serverTimestampRaw};` +
        "turbo=0;" +
        "user-id=425963448;" +
        `user-type=${getTagString(msg.ircTags, "user-type")} ` +
        ":usernotice!usernotice@usernotice.tmi.twitch.tv PRIVMSG " +
        `#${msg.channelName} :${msg.systemMessage}`
    )
  );
  return frames;
}
