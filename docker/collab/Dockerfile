FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json eslint.config.js prettier.config.js ./
COPY apps ./apps
COPY packages ./packages

RUN npm ci

EXPOSE 4001
