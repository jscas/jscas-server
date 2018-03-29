FROM node:8-alpine

WORKDIR /app
EXPOSE 3000

CMD npm install --production --no-save && node app.js
