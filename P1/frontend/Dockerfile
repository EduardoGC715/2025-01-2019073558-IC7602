FROM node:20-alpine3.17

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY public ./public
COPY src ./src

EXPOSE 80

CMD ["sh", "-c", "npm run build && npx serve -s build -l 80"]