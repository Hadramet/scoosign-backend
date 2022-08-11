FROM node:16-alpine
WORKDIR /usr/src/app
COPY package.json yarn.lock ./
RUN yarn install && yarn cache clean
COPY . .
EXPOSE 5000
CMD npx --yes dotenv-vault@latest pull --dotenvMe $DOTENV_ME; node src/index.js