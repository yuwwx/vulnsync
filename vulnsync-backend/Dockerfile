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
FROM node:24-alpine AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

ENV NODE_TLS_REJECT_UNAUTHORIZED=0

RUN npx prisma generate
RUN npm run build

# Отрезаем dev-зависимости, чтобы runtime-слой не копировал
# typescript/webpack/eslint/jest и прочее (node_modules сильно меньше и COPY быстрее)
RUN npm prune --omit=dev

# -------- runtime --------
FROM node:24-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=$ENV

COPY --from=build /app/prisma.config.ts ./prisma.config.ts 
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
