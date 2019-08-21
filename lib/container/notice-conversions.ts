import { NoticeMessage } from "dank-twitch-irc/dist/message/twitch-types/notice";
import * as randomUUID from "uuid/v4";
import { ContainerFrame, newFrame } from "./message-container";

export function noticeToPrivmsgFrame(msg: NoticeMessage): ContainerFrame {
  return newFrame(
    "@badges=twitchbot/1;color=#613FA0;display-name=NOTICE;" +
    `emotes=;flags=;id=${randomUUID()};mod=0;subscriber=0;` +
    `tmi-sent-ts=${Date.now()};turbo=0;user-id=1335710;user-type= ` + // FIXME Date.now()
      `:notice!notice@notice.tmi.twitch.tv PRIVMSG #${msg.channelName} ` +
      `:${msg.messageText}`
  );
}
