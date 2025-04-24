FROM node:20-alpine3.17

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY public ./public
COPY src ./src

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]