FROM node:20-alpine AS build
WORKDIR /app
ARG VITE_API_BASE_URL=http://localhost:4000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
COPY package.json package-lock.json* ./
COPY shared/package.json shared/package.json
COPY client/package.json client/package.json
RUN npm install
COPY shared shared
COPY client client
RUN npm run build --workspace shared && npm run build --workspace client

FROM nginx:1.27-alpine
COPY --from=build /app/client/dist /usr/share/nginx/html
EXPOSE 80
