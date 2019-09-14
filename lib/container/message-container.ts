import { IRCMessage } from "dank-twitch-irc/dist/message/irc/irc-message";
import { IRCMessageTags } from "dank-twitch-irc/dist/message/irc/tags";
import { parseTwitchMessage } from "dank-twitch-irc/dist/message/parser/twitch-message";
import { ClearchatMessage } from "dank-twitch-irc/dist/message/twitch-types/clearchat";
import { ClearmsgMessage } from "dank-twitch-irc/dist/message/twitch-types/clearmsg";
import { PrivmsgMessage } from "dank-twitch-irc/dist/message/twitch-types/privmsg";
import { UsernoticeMessage } from "dank-twitch-irc/dist/message/twitch-types/usernotice";
import * as _ from "lodash";
import { RetrievedMessage } from "../data/message-storage";
import { makeFramesToAppend } from "./make-frames";

export interface ContainerFrame {
  /**
   * This is the message that is shown to the user, may be equal to originalMessage, but can be a different
   * manufactured message depending on the append-options.
   */
  shownMessage: IRCMessage;

  /**
   * This is the message that we were asked to append.
   */
  originalMessage?: IRCMessage;

  /**
   * Extra tags to bolt onto the shown message on export.
   */
  extraTags: IRCMessageTags;
}

export function frameOf(shownMessage: IRCMessage): ContainerFrame {
  return {
    shownMessage,
    extraTags: {}
  };
}

export function newFrame(rawIrcSource: string): ContainerFrame {
  return frameOf(parseTwitchMessage(rawIrcSource));
}

enum KnownExtraTags {
  RECEIVED_TIMESTAMP = "rm-received-ts",
  IS_DELETED = "rm-deleted",
  IS_HISTORICAL = "historical"
}

export interface ContainerAppendOptions {
  clearchatToNotice: boolean;
  hideModerationMessages: boolean;
  hideModeratedMessages: boolean;
}

export function stringifyTag(key: string, value: string | null): string {
  if (value != null) {
    return `${key}=${value}`;
  } else {
    return key;
  }
}

export function appendExtraTags(
  tags: IRCMessageTags,
  ircString: string
): string {
  for (const [key, value] of Object.entries(tags)) {
    if (ircString.startsWith("@")) {
      ircString = `@${stringifyTag(key, value)};${ircString.slice(1)}`;
    } else {
      ircString = `@${stringifyTag(key, value)} ${ircString}`;
    }
  }

  return ircString;
}

export class MessageContainer {
  private readonly frames: Array<Required<ContainerFrame>> = [];
  private readonly options: ContainerAppendOptions;

  public constructor(options: ContainerAppendOptions) {
    this.options = options;
  }

  public append(retrievedMsg: RetrievedMessage): void {
    const msg: IRCMessage = parseTwitchMessage(retrievedMsg.message);
    const createTime = retrievedMsg.createTime;

    // if this is a CLEARCHAT or CLEARMSG, the messages matching it are marked as rm-deleted=1
    this.applyDeletion(msg);

    // this applies to options (e.g. clearchat to notice) and produces the frames to
    // present to the user
    const framesToAppend = makeFramesToAppend(msg, createTime, this.options);

    for (const frame of framesToAppend) {
      frame.originalMessage = msg;

      frame.extraTags[KnownExtraTags.IS_HISTORICAL] = "1";
      frame.extraTags[KnownExtraTags.RECEIVED_TIMESTAMP] = String(
        retrievedMsg.createTime
      );

      this.frames.push(frame as Required<ContainerFrame>);
    }
  }

  public export(): string[] {
    return this.frames.map(frame =>
      appendExtraTags(frame.extraTags, frame.shownMessage.rawSource)
    );
  }

  private applyDeletion(msg: IRCMessage): void {
    if (msg instanceof ClearchatMessage) {
      if (msg.wasChatCleared()) {
        this.markDeleted();
      } else if (msg.isPermaban() || msg.isTimeout()) {
        this.markDeleted(
          otherMsg =>
            otherMsg.senderUsername === (msg as ClearchatMessage).targetUsername
        );
      }
    }

    if (msg instanceof ClearmsgMessage) {
      this.markDeleted(
        otherMsg =>
          otherMsg.messageID === (msg as ClearmsgMessage).targetMessageID
      );
    }
  }

  private markDeleted(
    predicate?: (msg: PrivmsgMessage | UsernoticeMessage) => boolean
  ): void {
    const fullPredicate = ({
      originalMessage: msg
    }: Required<ContainerFrame>): boolean => {
      if (
        !(msg instanceof PrivmsgMessage || msg instanceof UsernoticeMessage)
      ) {
        return false;
      }

      return predicate == null || predicate(msg);
    };

    if (this.options.hideModeratedMessages) {
      _.remove(this.frames, fullPredicate);
    } else {
      for (const frame of this.frames) {
        if (fullPredicate(frame)) {
          frame.extraTags[KnownExtraTags.IS_DELETED] = "1";
        }
      }
    }
  }
}
