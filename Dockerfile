# Build stage
FROM node:20-alpine AS build
WORKDIR /app

# Many CI/PaaS set production flags during build, which can cause devDependencies
# (vite/tailwind/ts) to be skipped and then `npm run build` fails with "vite: not found".
# Force dev deps to be installed in the build stage.
ENV NODE_ENV=development
ENV npm_config_production=false

COPY package.json package-lock.json* ./

# `--include=dev` is the key: even if the platform injects production settings,
# we still install devDependencies required for the build.
RUN npm install --include=dev --no-fund --no-audit

COPY . .
RUN npm run build

# Runtime stage (static SPA + fallback routing)
FROM nginx:1.27-alpine

# Support Zeabur's dynamic $PORT (and other PaaS that inject PORT).
# The official nginx image envsubsts templates in /etc/nginx/templates/*.template on startup.
ENV PORT=80
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
