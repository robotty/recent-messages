import { IRCMessage } from "dank-twitch-irc/dist/message/irc/irc-message";
import { ClearchatMessage } from "dank-twitch-irc/dist/message/twitch-types/clearchat";
import { ClearmsgMessage } from "dank-twitch-irc/dist/message/twitch-types/clearmsg";
import { NoticeMessage } from "dank-twitch-irc/dist/message/twitch-types/notice";
import { clearchatToNoticeFrame } from "./clearchat-conversions";
import {
  ContainerAppendOptions,
  ContainerFrame,
  frameOf
} from "./message-container";

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
  createTime: number,
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

  if (options.clearchatToNotice && msg instanceof ClearchatMessage) {
    return [clearchatToNoticeFrame(msg)];
  }

  return [frameOf(msg)];
}
