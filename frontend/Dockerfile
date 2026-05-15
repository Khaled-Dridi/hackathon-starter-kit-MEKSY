# syntax=docker/dockerfile:1.7
# Stage 1: build Angular app
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm npm ci

COPY . .
RUN npm run build -- --configuration production

# Stage 2: serve with nginx
FROM nginx:1.27-alpine
COPY --from=build /app/dist/starter-frontend/browser/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
