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
FROM node:24-alpine AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

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
