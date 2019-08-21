# recent-messages

Twitch IRC bot and web service that serves the last N (currently 500)
messages for chat clients to use when they join a channel.

# Database setup

```bash
sudo -u postgres psql
#> CREATE USER recent_messages;
#> CREATE DATABASE recent_messages OWNER recent_messages;
#> \q
```

# System setup

```bash
sudo adduser --system --home /opt/recent-messages \
  --shell /bin/false --no-create-home --group \
  --disabled-password --disabled-login  \
  recent_messages
```

# Install production dependencies

```bash
npm i --production
```

# systemd install

```bash
sudo cp ./recent-messages.service /etc/systemd/system/recent-messages.service
sudo systemctl daemon-reload
sudo systemctl enable recent-messages
sudo systemctl start recent-messages
```

# nginx config

```bash
sudo cp ./install/nginx/recent-messages.example.com /etc/nginx/sites-available/recent-messages.yourdomain.com
# edit in your variables
sudo editor /etc/nginx/sites-available/recent-messages.yourdomain.com
sudo nginx -t
sudo systemctl reload nginx
```

# Grafana dashboard

Import `./install/grafana/recent-messages.json` via the "Import dashboard" page.
