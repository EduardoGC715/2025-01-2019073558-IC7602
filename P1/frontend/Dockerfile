FROM node:20-alpine3.17

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY public ./public
COPY src ./src

RUN npm run build

EXPOSE 80

CMD ["npx", "serve", "-s", "build", "-l", "80"]