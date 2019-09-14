import { ClientConfiguration } from "dank-twitch-irc/dist/config/config";
import * as debugLogger from "debug-logger";
import { RedisOptions } from "ioredis";
import * as moment from "moment";
import { Duration } from "moment";
import { ListenOptions } from "net";
import { PoolConfig } from "pg";

const log = debugLogger("recent-messages:config");

export function setDefaults<T>(input: Partial<T> = {}, defaults: T): T {
  return Object.assign({}, defaults, input);
}

export interface AppConfiguration {
  httpServerOptions: ListenOptions;
  ircClientConfig: ClientConfiguration;
  interactiveBot: {
    enabled: boolean;
    ircClientConfig: ClientConfiguration;
  };
  databaseConfig: PoolConfig;
  redisConfig: RedisOptions;

  /**
   * If a channel's recent messages were not accessed for this long, the channel is subject to be parted
   */
  channelExpiry: Duration;
  bufferSize: number;
}

const configDefaults: AppConfiguration = {
  httpServerOptions: {
    path: "/var/run/recent-messages/server.sock",
    readableAll: true,
    writableAll: true
  },
  ircClientConfig: {},
  interactiveBot: {
    enabled: false,
    ircClientConfig: {}
  },
  databaseConfig: {
    host: "/var/run/postgresql",
    database: "recent_messages"
  },
  redisConfig: {
    path: "/var/run/redis/redis-server.sock"
  },
  channelExpiry: moment.duration(1, "week"),
  bufferSize: 500
};

export function loadConfig(): AppConfiguration {
  let partialConfig: Partial<AppConfiguration>;
  try {
    partialConfig = require("../config");
  } catch (e) {
    log.warn(
      "No configuration at config.js found (or failed to load), falling back to all defaults.",
      e
    );
    partialConfig = {};
  }
  return setDefaults(partialConfig, configDefaults);
}
