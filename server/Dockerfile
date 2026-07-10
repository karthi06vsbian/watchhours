FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY shared/package.json shared/package.json
COPY server/package.json server/package.json
RUN npm install
COPY shared shared
COPY server server
RUN npm run build --workspace shared && npm run build --workspace server

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
COPY shared/package.json shared/package.json
COPY server/package.json server/package.json
RUN npm install --omit=dev
COPY --from=build /app/shared/dist shared/dist
COPY --from=build /app/server/dist server/dist
EXPOSE 4000
CMD ["npm", "run", "start", "--workspace", "server"]
