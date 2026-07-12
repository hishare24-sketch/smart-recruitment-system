# ===== الواجهة (Vue) → بناء Vite ثم تقديم عبر nginx (80/443 + Let's Encrypt) =====

FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html env.d.ts tsconfig.json tsconfig.node.json vite.config.ts \
     tailwind.config.js postcss.config.js ./
COPY public ./public
COPY src ./src

ARG DOCKER=1
ARG VITE_APP_NAME="منظومة التوظيف الذكية"
ARG VITE_USE_REAL_API=true
ARG VITE_BASE_API_URL=/api
ARG VITE_REVERB_APP_KEY
ARG VITE_REVERB_HOST=
ARG VITE_REVERB_PORT=
ARG VITE_REVERB_SCHEME=https

ENV DOCKER=$DOCKER \
    VITE_APP_NAME=$VITE_APP_NAME \
    VITE_USE_REAL_API=$VITE_USE_REAL_API \
    VITE_BASE_API_URL=$VITE_BASE_API_URL \
    VITE_REVERB_APP_KEY=$VITE_REVERB_APP_KEY \
    VITE_REVERB_HOST=$VITE_REVERB_HOST \
    VITE_REVERB_PORT=$VITE_REVERB_PORT \
    VITE_REVERB_SCHEME=$VITE_REVERB_SCHEME

RUN npm run build

FROM nginx:1.27-alpine
COPY docker/nginx/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh \
    && mkdir -p /var/www/certbot
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80 443
ENTRYPOINT ["/entrypoint.sh"]
