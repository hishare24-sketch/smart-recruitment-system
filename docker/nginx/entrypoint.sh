#!/bin/sh
# يولّد كونفيج nginx حسب وجود شهادة Let's Encrypt للدومين.
set -e

DOMAIN="${DOMAIN:-recruitment.mawazinswift.com}"
CERT_DIR="/etc/letsencrypt/live/${DOMAIN}"
CONF="/etc/nginx/conf.d/default.conf"

mkdir -p /var/www/certbot /etc/nginx/conf.d

cat > /etc/nginx/conf.d/00-map.conf << 'EOF'
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}
EOF

# جزء مشترك: SPA + API + Reverb
COMMON_LOCATIONS=$(cat << 'EOF'
    root /usr/share/nginx/html;
    index index.html;
    client_max_body_size 32m;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location /api/ {
        proxy_pass http://laravel_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Authorization $http_authorization;
        proxy_pass_header Authorization;
    }

    location = /up {
        proxy_pass http://laravel_api;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /broadcasting/ {
        proxy_pass http://laravel_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Authorization $http_authorization;
    }

    location /app {
        proxy_pass http://reverb_ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
EOF
)

cat > "$CONF" << EOF
upstream laravel_api {
    server api:10000;
}

upstream reverb_ws {
    server reverb:8080;
}
EOF

if [ -f "${CERT_DIR}/fullchain.pem" ] && [ -f "${CERT_DIR}/privkey.pem" ]; then
  echo "[nginx] TLS enabled for ${DOMAIN}"
  cat >> "$CONF" << EOF

server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name ${DOMAIN};

    ssl_certificate     ${CERT_DIR}/fullchain.pem;
    ssl_certificate_key ${CERT_DIR}/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_protocols TLSv1.2 TLSv1.3;

${COMMON_LOCATIONS}
}
EOF
else
  echo "[nginx] no certificate yet — serving HTTP only on :80 for ${DOMAIN}"
  echo "[nginx] after DNS points here, run: docker compose run --rm certbot-init && docker compose exec web nginx -s reload"
  cat >> "$CONF" << EOF

server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} _;

${COMMON_LOCATIONS}
}
EOF
fi

nginx -t
exec nginx -g 'daemon off;'
