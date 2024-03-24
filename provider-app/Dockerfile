FROM node:21

WORKDIR /provider-app

COPY package*.json ./

RUN npm install

COPY . /provider-app

EXPOSE 4001

CMD [ "npm", "start" ]