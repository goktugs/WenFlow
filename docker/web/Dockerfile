FROM node:22-alpine

WORKDIR /app

COPY package.json tsconfig.base.json eslint.config.js prettier.config.js ./
COPY apps ./apps
COPY packages ./packages

RUN npm install

EXPOSE 5173

