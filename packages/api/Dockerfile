FROM node:25.4.0-alpine AS base
WORKDIR /app
COPY package*.json ./
COPY packages/lib/package*.json  ./packages/lib/
COPY packages/lib/tsconfig*.json ./packages/lib/
COPY packages/api/package*.json  ./packages/api/
COPY packages/api/tsconfig*.json ./packages/api/
RUN npm ci


FROM base AS dev
WORKDIR /app/packages/api
CMD ["npm", "run", "docker:dev"]


FROM base AS builder
COPY packages/lib/src ./packages/lib/src
RUN npm run build:lib
COPY packages/api/src ./packages/api/src
RUN npm run build:api


FROM base AS prod-deps
RUN npm ci --omit=dev


FROM node:25.4.0-alpine AS prod
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps /app/node_modules            ./node_modules
COPY --from=builder /app/packages/lib/dist         ./packages/lib/dist
COPY --from=builder /app/packages/lib/package.json ./packages/lib/
COPY --from=builder /app/packages/api/dist         ./packages/api/dist
COPY --from=builder /app/packages/api/package.json ./packages/api/
WORKDIR /app/packages/api
RUN npm install -g pm2
ENTRYPOINT ["pm2-runtime", "start", "dist/index.js", "-i", "4"]
