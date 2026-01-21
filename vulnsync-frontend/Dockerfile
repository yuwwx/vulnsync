# -------- deps --------
FROM node:24-alpine AS deps

WORKDIR /app

ARG ENV=dev
ENV ENV=$ENV

COPY package*.json ./

# Если prod - используем Nexus
RUN if [ "$ENV" = "production" ]; then \
      npm config set registry https://nexus3-ift.sigma-COMPANY.by/repository/npm-all; \
    fi

# Отключаем проверку SSL
RUN npm config set strict-ssl false

RUN npm ci --verbose

# -------- build --------
FROM node:24-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# -------- runtime --------
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=$ENV

# standalone сервер
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
