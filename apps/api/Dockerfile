## Stage 1 — Build React frontend
FROM node:22-alpine AS web-builder
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace @photogal/web

COPY apps/web/ apps/web/
RUN npm run build --workspace @photogal/web

## Stage 2 — Build API (TypeScript → JS)
FROM node:22-alpine AS api-builder
RUN apk add --no-cache python3 make g++
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci

COPY apps/api/ apps/api/
RUN npm run build --workspace @photogal/api

## Stage 3 — Runtime
FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
  && npm ci --workspace @photogal/api --omit=dev \
  && apk del .build-deps

COPY --from=api-builder /app/apps/api/dist apps/api/dist
COPY --from=web-builder /app/apps/web/dist apps/web/dist

RUN mkdir -p /app/data
EXPOSE 3001
CMD ["node", "apps/api/dist/index.js"]
