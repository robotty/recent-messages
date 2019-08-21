import { IRCMessage } from "dank-twitch-irc/dist/message/irc/irc-message";
import { ClearchatMessage } from "dank-twitch-irc/dist/message/twitch-types/clearchat";
import { ClearmsgMessage } from "dank-twitch-irc/dist/message/twitch-types/clearmsg";
import { NoticeMessage } from "dank-twitch-irc/dist/message/twitch-types/notice";
import { PrivmsgMessage } from "dank-twitch-irc/dist/message/twitch-types/privmsg";
import { UsernoticeMessage } from "dank-twitch-irc/dist/message/twitch-types/usernotice";
import {
  clearchatToNoticeFrame,
  clearchatToPrivmsgFrame
} from "./clearchat-conversions";
import {
  ContainerAppendOptions,
  ContainerFrame,
  frameOf
} from "./message-container";
import { noticeToPrivmsgFrame } from "./notice-conversions";
import { usernoticeToPrivmsgFrames } from "./usernotice-conversions";

// filter noisy notices
const omittedNoticeIDs: string[] = [
  "no_permission",
  "host_on",
  "host_off",
  "host_target_went_offline",
  "msg_channel_suspended"
];

const exportedMessageTypes: string[] = [
  "PRIVMSG",
  "CLEARCHAT",
  "CLEARMSG",
  "USERNOTICE",
  "NOTICE",
  "ROOMSTATE"
];

export function makeFramesToAppend(
  msg: IRCMessage,
  options: ContainerAppendOptions
): ContainerFrame[] {
  if (!exportedMessageTypes.includes(msg.ircCommand)) {
    return [];
  }

  if (
    (msg instanceof ClearchatMessage || msg instanceof ClearmsgMessage) &&
    options.hideModerationMessages
  ) {
    return [];
  }

  if (
    msg instanceof NoticeMessage &&
    omittedNoticeIDs.includes(msg.messageID!)
  ) {
    return [];
  }

  if (options.privmsgOnly) {
    if (msg instanceof PrivmsgMessage) {
      return [frameOf(msg)];
    }

    // supported conversions...
    if (msg instanceof ClearchatMessage) {
      return [clearchatToPrivmsgFrame(msg)];
    }

    if (msg instanceof UsernoticeMessage) {
      return usernoticeToPrivmsgFrames(msg);
    }

    if (msg instanceof NoticeMessage) {
      return [noticeToPrivmsgFrame(msg)];
    }

    // bail out. Type cannot be converted and will be omitted.
    return [];
  }

  if (options.clearchatToNotice && msg instanceof ClearchatMessage) {
    return [clearchatToNoticeFrame(msg)];
  }

  return [frameOf(msg)];
}
