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
import { StatusCodeError } from "./status-error";
import * as path from "path";
import * as helmet from "helmet";

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
    this.app.use(helmet.noSniff());

    const expressMetrics = ExpressMetricsBundle.instrument(
      this.app,
      metricsRegistry
    );

    this.app.use("/metrics", expressMetrics.requestHandler);

    const route = new RecentMessagesRoute(
      channelStorage,
      messageStorage,
      chatClient
    );
    this.app.use(["/api/v2"], route.router);

    this.app.use("/v1", (req, res) => {
      throw new StatusCodeError(
        410,
        "War.. war never changes, but APIs do. " +
          "See https://github.com/robotty/recent-messages for details"
      );
    });

    this.app.get("/license", (req, res) => {
      res.contentType("text/plain");
      res.sendFile(path.normalize(__dirname + "/../../LICENSE"));
    });
    this.app.get("/privacy", (req, res) => {
      res.contentType("text/plain");
      res.sendFile(path.normalize(__dirname + "/../../PRIVACY"));
    });

    this.app.get("/", (req, res) => {
      res
        .type("text/html")
        .send(
          '<a href="privacy">go to privacy statement</a><br>' +
            '<a href="license">go to license</a><br>' +
            '<a href="https://github.com/robotty/recent-messages">download source code and learn more</a>'
        );
    });

    this.app.use("*", (req, res) => {
      throw new StatusCodeError(404, "Not found");
    });

    registerDefaultErrorHandler(this.app);
  }
}
