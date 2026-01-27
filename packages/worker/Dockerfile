FROM node:25.4.0-alpine AS base
WORKDIR /app
COPY package*.json ./
COPY packages/lib/package*.json     ./packages/lib/
COPY packages/lib/tsconfig*.json    ./packages/lib/
COPY packages/worker/package*.json  ./packages/worker/
COPY packages/worker/tsconfig*.json ./packages/worker/
RUN npm ci


FROM base AS dev
WORKDIR /app/packages/worker
CMD ["npm", "run", "docker:dev"]


FROM base AS builder
COPY packages/lib/src ./packages/lib/src
RUN npm run build:lib
COPY packages/worker/src ./packages/worker/src
RUN npm run build:worker


FROM base AS prod-deps
RUN npm ci --omit=dev


FROM node:25.4.0-alpine AS prod
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps /app/node_modules               ./node_modules
COPY --from=builder /app/packages/lib/dist            ./packages/lib/dist
COPY --from=builder /app/packages/lib/package.json    ./packages/lib/
COPY --from=builder /app/packages/worker/dist         ./packages/worker/dist
COPY --from=builder /app/packages/worker/package.json ./packages/worker/
WORKDIR /app/packages/worker
RUN npm install -g pm2
ENTRYPOINT ["pm2-runtime", "start", "dist/index.js", "-i", "4"]
