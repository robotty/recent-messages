let defaultLoggerConfig = false;
if (process.env["DEBUG"] == null) {
  process.env.DEBUG = "*,-babel*,-ioredis*,-express*,-*:trace";
  defaultLoggerConfig = true;
}

import * as debugLogger from "debug-logger";
const log = debugLogger("recent-messages:main");

if (defaultLoggerConfig) {
  log.info(
    "The application was initialized with a default value for the DEBUG " +
      "environment variable. Logging can be customized " +
      "by starting the application with the DEBUG environment variable set."
  );
}

import "clarify";
import * as IORedis from "ioredis";
import { fullStack } from "make-error-cause";
import { Pool } from "pg";
import "source-map-support/register";
import { collectDefaultMetrics, Registry } from "prom-client";
import { ApiApp } from "../api/app";
import { HttpServer } from "../api/server";
import { startChannelControl } from "../chat/channel-control";
import { forwardMessagesToRedis } from "../chat/forward-messages-to-redis";
import { startChatClient } from "../chat/start-client";
import { AppConfiguration, loadConfig } from "../config";
import { ChannelStorage } from "../data/channel-storage";
import { createPoolAndRunMigrations } from "../data/db";
import { MessageStorage } from "../data/message-storage";
import { ChatClientMetricsBundle } from "../metrics/chat-client";
import gcStats = require("prometheus-gc-stats");

const config: AppConfiguration = loadConfig();

(async () => {
  const db: Pool = await createPoolAndRunMigrations(config.databaseConfig);
  const redisClient = new IORedis({
    lazyConnect: true,
    ...config.redisConfig
  });
  await redisClient.connect();

  const channelStorage = new ChannelStorage(db, config.channelExpiry);
  const messageStorage = new MessageStorage(redisClient);

  const chatClient = await startChatClient(config.ircClientConfig);

  const metricsRegistry = new Registry();
  ChatClientMetricsBundle.instrument(chatClient, metricsRegistry);
  collectDefaultMetrics({ register: metricsRegistry, timeout: 10 * 1000 });
  gcStats(metricsRegistry)();

  await startChannelControl(chatClient, channelStorage, messageStorage);
  forwardMessagesToRedis(chatClient, messageStorage);

  const { app } = new ApiApp(
    channelStorage,
    messageStorage,
    chatClient,
    metricsRegistry
  );
  const httpServer = new HttpServer(app, config.httpServerOptions);
  await httpServer.start();
})().catch(e => {
  log.error("Initialization failure", fullStack(e));
  process.exit(1);
});
