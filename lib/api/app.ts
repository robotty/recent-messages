import cors = require("cors");
import { ChatClient } from "dank-twitch-irc";
import * as express from "express";
import { Express } from "express";
import { Registry } from "prom-client";
import { ChannelStorage } from "../data/channel-storage";
import { MessageStorage } from "../data/message-storage";
import { ExpressMetricsBundle } from "../metrics/express";
import { registerDefaultErrorHandler } from "./error-handler";
import { RecentMessagesRoute } from "./routes/recent-messages";

export class ApiApp {
  public app: Express;

  public constructor(
    channelStorage: ChannelStorage,
    messageStorage: MessageStorage,
    chatClient: ChatClient,
    metricsRegistry: Registry
  ) {
    this.app = express();

    this.app.use(cors());

    const expressMetrics = ExpressMetricsBundle.instrument(
      this.app,
      metricsRegistry
    );

    this.app.use("/metrics", expressMetrics.requestHandler);

    this.app.use(["/api/v1", "/v1"], (req, res, next) => {
      // @ts-ignore apiVersion does not exist on Request
      req.apiVersion = 1;
      next();
    });

    this.app.use(["/api/v2"], (req, res, next) => {
      // @ts-ignore apiVersion does not exist on Request
      req.apiVersion = 2;
      next();
    });

    const route = new RecentMessagesRoute(
      channelStorage,
      messageStorage,
      chatClient
    );
    this.app.use(["/api/v1", "/v1", "/api/v2"], route.router);

    registerDefaultErrorHandler(this.app);
    // this.app.use((req, res, next) => {
    //     res.status(404).send('404 not found');
    // });
  }
}
