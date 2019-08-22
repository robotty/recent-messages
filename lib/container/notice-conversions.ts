import { NoticeMessage } from "dank-twitch-irc/dist/message/twitch-types/notice";
import * as randomUUID from "uuid/v4";
import { ContainerFrame, newFrame } from "./message-container";

export function noticeToPrivmsgFrame(
  msg: NoticeMessage,
  createTime: number
): ContainerFrame {
  return newFrame(
    "@badge-info=;badges=twitchbot/1;color=#613FA0;display-name=NOTICE;" +
      `emotes=;flags=;id=${randomUUID()};mod=0;room-id=-1;subscriber=0;` +
      `tmi-sent-ts=${createTime};turbo=0;user-id=1335710;user-type= ` +
      `:notice!notice@notice.tmi.twitch.tv PRIVMSG #${msg.channelName} ` +
      `:${msg.messageText}`
  );
}
