const moment = require("moment");

module.exports = {
    // https://nodejs.org/api/net.html#net_server_listen_options_callback
    httpServerOptions: {
        path: "/var/run/recent-messages/server.sock",
        readableAll: true,
        writableAll: true
    },
    channelExpiry: moment.duration(1, "week"),
    redisConfig: {
        path: "/var/run/redis/redis-server.sock"
    },
    databaseConfig: {
        host: "/var/run/postgresql",
        database: "recent_messages"
    }
};
