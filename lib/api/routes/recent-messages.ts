import * as Joi from "@hapi/joi";
import { ChatClient } from "dank-twitch-irc";
import { JoinError } from "dank-twitch-irc/dist/operations/join";
import { validateChannelName } from "dank-twitch-irc/dist/validation/channel";
import * as debugLogger from "debug-logger";
import { Request, Response, Router } from "express";
import { createValidator } from "express-joi-validation";
import PromiseRouter from "express-promise-router";
import {
  ContainerAppendOptions,
  MessageContainer
} from "../../container/message-container";
import { ChannelStorage } from "../../data/channel-storage";
import { MessageStorage } from "../../data/message-storage";
import { StatusCodeError } from "../status-error";

const validator = createValidator();

const log = debugLogger("recent-messages:irc");

export class RecentMessagesRoute {
  public readonly router: Router;
  private readonly channelStorage: ChannelStorage;
  private readonly messageStorage: MessageStorage;
  private readonly chatClient: ChatClient;

  public constructor(
    channelStorage: ChannelStorage,
    messageStorage: MessageStorage,
    chatClient: ChatClient
  ) {
    this.channelStorage = channelStorage;
    this.messageStorage = messageStorage;
    this.chatClient = chatClient;

    this.router = PromiseRouter();

    this.registerGetRecentMessages();
  }

  private registerGetRecentMessages(): void {
    const paramSchema = Joi.object({
      channelName: Joi.string()
        .lowercase()
        .required()
    });

    const querySchema = Joi.object({
      clearchatToNotice: Joi.boolean().default(false),
      privmsgOnly: Joi.boolean().default(false),
      hideModerationMessages: Joi.boolean().default(false),
      hideModeratedMessages: Joi.boolean().default(false)
    });

    this.router.get(
      "/recent-messages/:channelName",
      validator.params(paramSchema),
      validator.query(querySchema),
      this.handleGetRecentMessages.bind(this)
    );
  }

  private async handleGetRecentMessages(
    req: Request,
    res: Response
  ): Promise<void> {
    const channelName = req.params.channelName;
    try {
      validateChannelName(channelName);
    } catch (e) {
      throw new StatusCodeError(400, "Invalid channel name format");
    }

    let options: ContainerAppendOptions;

    // @ts-ignore apiVersion does not exist on Request
    if (req.apiVersion === 1) {
      options = {
        clearchatToNotice: false,
        privmsgOnly: true,
        hideModerationMessages: false,
        hideModeratedMessages: false
      };
    } else {
      options = {
        clearchatToNotice: req.query.clearchatToNotice,
        privmsgOnly: req.query.privmsgOnly,
        hideModerationMessages: req.query.hideModerationMessages,
        hideModeratedMessages: req.query.hideModeratedMessages
      };
    }

    const retrievedMessages = await this.messageStorage.getMessages(
      channelName
    );

    const container = new MessageContainer(options);
    retrievedMessages.forEach(msg => container.append(msg));

    const sentMessages = container.export();
    let error: string | null = null;

    if (!this.chatClient.wantedChannels.has(channelName)) {
      try {
        await this.chatClient.join(channelName);
      } catch (e) {
        if (e instanceof JoinError) {
          error = e.message;
        } else {
          throw e;
        }
      }
    }

    if (error == null && !this.chatClient.joinedChannels.has(channelName)) {
      error =
        "The bot is currently not joined to this channel " +
        "(in progress or failed previously)";
    }

    res.json({ messages: sentMessages, error });

    if (error == null) {
      // channel is not touched/added if join fails, so
      // suspended/invalid channels get wiped from the storage
      // after some time/not joined at all
      await this.channelStorage.touchOrAdd(channelName);
    }
  }
}
