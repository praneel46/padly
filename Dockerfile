# Multi-stage Dockerfile for Padly
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/data ./data
COPY --from=builder /app/public ./public
COPY --from=builder /app/uploads ./uploads

EXPOSE 3001

CMD ["npx", "tsx", "server/index.ts"]
