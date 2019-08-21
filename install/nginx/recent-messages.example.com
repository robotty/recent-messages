server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    server_name recent-messages.example.com;

    location =/metrics {
        return 403;
    }

    location / {
        proxy_pass http://unix:/var/run/recent-messages/server.sock;
        include proxy_params;
    }
}
