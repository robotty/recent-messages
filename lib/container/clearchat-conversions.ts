import { ParseError } from "dank-twitch-irc/dist/message/parser/parse-error";
import { ClearchatMessage } from "dank-twitch-irc/dist/message/twitch-types/clearchat";
import * as prettyMs from "pretty-ms";
import { ContainerFrame, newFrame } from "./message-container";

export function stringifyClearchat(msg: ClearchatMessage): string {
  if (msg.wasChatCleared()) {
    return "Chat has been cleared by a moderator.";
  } else if (msg.isTimeout()) {
    return `${msg.targetUsername} has been timed out for ${prettyMs(
      msg.banDuration * 1000
    )}.`;
  } else if (msg.isPermaban()) {
    return `${msg.targetUsername} has been permanently banned.`;
  }

  throw new ParseError(
    "CLEARCHAT was not a clear, timeout or ban: " + msg.rawSource
  );
}

export function clearchatToNoticeFrame(msg: ClearchatMessage): ContainerFrame {
  const frame = newFrame(
    `:tmi.twitch.tv NOTICE #${msg.channelName} :${stringifyClearchat(msg)}`
  );
  if (msg.wasChatCleared()) {
    frame.extraTags["msg-id"] = "rm-clearchat";
  } else if (msg.isTimeout()) {
    frame.extraTags["msg-id"] = "rm-timeout";
  } else if (msg.isPermaban()) {
    frame.extraTags["msg-id"] = "rm-permaban";
  }

  return frame;
}
