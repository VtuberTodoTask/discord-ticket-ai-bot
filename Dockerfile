FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc

COPY dashboard/package.json dashboard/package-lock.json* ./dashboard/
RUN cd dashboard && npm ci
COPY dashboard/ ./dashboard/
RUN cd dashboard && npm run generate

FROM node:20-alpine

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dashboard/.output/public ./dashboard/.output/public
COPY config/ ./config/

EXPOSE 3000

USER node
CMD ["node", "dist/index.js"]
