# -------- deps --------
FROM node:24-alpine AS deps

WORKDIR /app

ARG USE_NEXUS=false
ARG NEXUS_NPM_REGISTRY
ENV USE_NEXUS=$USE_NEXUS

COPY package*.json ./

# Если prod - используем Nexus
RUN if [ "$USE_NEXUS" = "true" ]; then \
      npm config set registry "$NEXUS_NPM_REGISTRY"; \
    fi

# Отключаем проверку SSL
RUN npm config set strict-ssl false

RUN npm i --verbose

# -------- build --------
FROM node:24-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

ARG NEXT_PUBLIC_AUTH_MODE=ldap
ENV NEXT_PUBLIC_AUTH_MODE=$NEXT_PUBLIC_AUTH_MODE

RUN npm run build

# -------- runtime --------
FROM node:24-alpine AS runner

WORKDIR /app

ARG ENV=dev
ENV ENV=$ENV
ENV NODE_ENV=$ENV

# standalone сервер
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
