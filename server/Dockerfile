FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY shared/package.json shared/package.json
COPY server/package.json server/package.json
RUN npm install
COPY shared shared
COPY server server
RUN npm run build --workspace shared && npm run build --workspace server

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production

# Install official Google Chrome Stable and its dependencies for full codec support (H.264/AAC)
RUN apt-get update && apt-get install -y wget gnupg ca-certificates \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Configure Puppeteer to use the official Google Chrome Stable executable
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

COPY package.json package-lock.json* ./
COPY shared/package.json shared/package.json
COPY server/package.json server/package.json
RUN npm install --omit=dev
COPY --from=build /app/shared/dist shared/dist
COPY --from=build /app/server/dist server/dist
EXPOSE 4000
CMD ["npm", "run", "start", "--workspace", "server"]
