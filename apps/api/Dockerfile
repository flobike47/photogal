FROM node:22-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci

COPY apps/api/ apps/api/
RUN npm run build --workspace @photogal/api

FROM node:22-alpine
RUN apk add --no-cache python3 make g++
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace @photogal/api --omit=dev

COPY --from=builder /app/apps/api/dist apps/api/dist

RUN mkdir -p /app/data
EXPOSE 3001
CMD ["node", "apps/api/dist/index.js"]
