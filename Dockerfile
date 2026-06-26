FROM node:24-alpine AS build

WORKDIR /app

RUN corepack enable

COPY . .

RUN pnpm install --no-frozen-lockfile
RUN pnpm build

FROM node:24-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV DB_PATH=/app/data/database.sqlite

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

RUN pnpm install --prod --ignore-workspace --no-frozen-lockfile

COPY --from=build /app/server ./server
COPY --from=build /app/excalidraw-app/build ./excalidraw-app/build

VOLUME ["/app/data"]

EXPOSE 3000

HEALTHCHECK CMD wget -qO- http://127.0.0.1:3000/api/health > /dev/null || exit 1

CMD ["node", "server/index.js"]
