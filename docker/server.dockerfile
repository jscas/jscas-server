FROM node:8-alpine

COPY docker/jscas.toml /etc
WORKDIR /app
EXPOSE 9000

CMD npm install --production --no-save && node server.js
