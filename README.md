# recent-messages

**Preface: This version of recent-messages has been superseded by [recent-messages2](https://github.com/robotty/recent-messages2).**

Twitch IRC bot and web service that serves the last N (by default 500) messages
for chat clients to use when they join a channel.

If you are a twitch user and you are concerned about your privacy and how to opt out, see the
[privacy statement](https://recent-messages.robotty.de/privacy) and the automated optout service
at https://www.twitch.tv/recent_messages

If you want to use the API/service, see below for the API docs.

If you plan to host a modified variant of this service yourself, please remember
it is licensed under the GNU AGPL v3 (or later). Please see [the `LICENSE` file](./LICENSE) for more details and
[this quick summary](<https://tldrlegal.com/license/gnu-affero-general-public-license-v3-(agpl-3.0)>).

## API

API Base URL: `https://recent-messages.robotty.de`

CORS is enabled for all origins.

I kindly ask consumers/clients of this API to set the `User-Agent` HTTP header
properly to the name of their application.

- **GET `/api/v2/recent-messages/:channelName`**

  Get the recent messages in the given channel. Response is JSON of this format:

  ```json
  {
    "messages": [
      "@rm-received-ts=1566417979914;historical=1;badge-info=subscriber/15;badges=moderator/1,subscriber/12,bits-charity/1;color=#9ACD32;display-name=Leppunen;emotes=;flags=;id=3c33033a-e957-4ffe-a426-5334f8161127;mod=1;room-id=11148817;subscriber=1;tmi-sent-ts=1566417979702;turbo=0;user-id=42239452;user-type=mod :leppunen!leppunen@leppunen.tmi.twitch.tv PRIVMSG #pajlada :!braize",
      "@rm-received-ts=1566417980441;historical=1;badge-info=subscriber/44;badges=moderator/1,subscriber/36;color=#2E8B57;display-name=pajbot;emotes=;flags=;id=fd183a1a-71f2-4da9-9480-dd4fd0750547;mod=1;room-id=11148817;subscriber=1;tmi-sent-ts=1566417980207;turbo=0;user-id=82008718;user-type=mod :pajbot!pajbot@pajbot.tmi.twitch.tv PRIVMSG #pajlada :C2 API Cache Uptime: 22h31m54.25816048s - Memory: Alloc=408 MiB, TotalAlloc=433524 MiB, Sys=1876 MiB, NumGC=1416",
      "... and so on"
    ],
    "error": null
  }
  ```
  
  The API returns `PRIVMSG`, `CLEARCHAT`, `CLEARMSG`, `USERNOTICE`, `NOTICE` and `ROOMSTATE` messages.

  This format is always returned, even on error (`messages` may be empty,
  though). `error` is either `null` or a string with an error message.
  The API will return `200 OK` but with an `error` value set in conditions where messages can still exist/
  be retrieved, but there might be an error preventing the service from collecting messages from that channel.
  (E.g. when you try to fetch messages for a suspended channel, or while the service is reconnecting to that
  channel)

  However, if the input `channelName` is of invalid format, you will get a `400 Bad Request` error:

  ```json
  {
    "status": 400,
    "statusMessage": "Bad Request",
    "error": "Invalid channel name format"
  }
  ```
  
  If the input `channelName` is ignored by the bot, you will get a `403 Forbidden` error:

  ```json
  {
    "status": 403,
    "statusMessage": "Forbidden",
    "error": "This channel is excluded from this service"
  }
  ```

  This endpoint supports the following optional query parameters:

  - `?clearchatToNotice=true` - Converts `CLEARCHAT` messages into `NOTICE`
    messages similar to how chatterino2 displays timeouts:

    ```
    @msg-id=rm-timeout :tmi.twitch.tv NOTICE #forsen :randers has been timed out for 10m20s.
    @msg-id=rm-permaban :tmi.twitch.tv NOTICE #forsen :randers has been permanently banned.
    @msg-id=rm-clearchat :tmi.twitch.tv NOTICE #forsen :Chat has been cleared by a moderator.
    ```

  - `?hideModerationMessages=true` - Omit all `CLEARCHAT` and `CLEARMSG`
    messages. This option can be combined with other options altering the
    message rendering such as `clearchatToNotice`.
  - `?hideModeratedMessages=true` - Omit all messages that were deleted by
    `CLEARCHAT` or `CLEARMSG` messages.

  Additionally, _all_ messages have the extra `rm-received-ts` (Time when the
  service received the message, milliseconds since the UTC epoch) and the
  `historical` tag:

  ```
  @rm-received-ts=1566418175808;historical=1;badge-info=subscriber...
  ```

  Deleted messages (deleted by `CLEARCHAT` or `CLEARMSG`) additionally carry the
  `rm-deleted=1` tag:

  ```
  @rm-deleted=1;rm-received-ts=1566418181479;historical=1;badge-info=subscriber...
  ```

- **GET `/metrics`**

  Dump a list of metrics to be consumed by a prometheus instance.

## Database setup

```bash
sudo -u postgres psql
#> CREATE USER recent_messages;
#> CREATE DATABASE recent_messages OWNER recent_messages;
#> \q
```

## System setup

```bash
sudo adduser --system --home /opt/recent-messages \
  --shell /bin/false --no-create-home --group \
  --disabled-password --disabled-login  \
  recent_messages
```

## Install production dependencies

```bash
npm i --production
```

## systemd install

```bash
sudo cp ./recent-messages.service /etc/systemd/system/recent-messages.service
sudo systemctl daemon-reload
sudo systemctl enable recent-messages
sudo systemctl start recent-messages
```

## nginx config

```bash
sudo cp ./install/nginx/recent-messages.example.com /etc/nginx/sites-available/recent-messages.yourdomain.com
# edit in your variables
sudo editor /etc/nginx/sites-available/recent-messages.yourdomain.com
sudo nginx -t
sudo systemctl reload nginx
```

## Grafana dashboard

Import `./install/grafana/recent-messages.json` via the "Import dashboard" page.
