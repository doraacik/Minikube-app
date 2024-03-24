FROM node:21

WORKDIR /client-app

COPY package*.json ./

RUN npm install

COPY . /client-app

EXPOSE 4002

CMD [ "npm", "start" ]