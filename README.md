# ScooSign Backend

[![fork with dotenv-vault](https://badge.dotenv.org/fork.svg?r=1)](https://vault.dotenv.org/project/vlt_d5552db009c95fd3f2e3c5b257986c6d88d7c416d65e359425cbe2a2b564e1cb/example) [![CodeFactor](https://www.codefactor.io/repository/github/hadramet/scoosign-backend/badge)](https://www.codefactor.io/repository/github/hadramet/scoosign-backend)

## Dev local environment

### Database (Dev only)

```sh
docker pull mongo
sudo mkdir -p /mongodata
sudo docker run -it -v mongodata:/data/db -p 27017:27017 --name mongodb -d mongo
```

### Docker

If its just for testing the app use the docker compose in the project root instead

```sh
docker build -t scoosign/backend . && docker run -e DOTENV_ME=me_21e7c958b7c7ee96346d89001e7c0fbee548a08c2799524869ffda2cb33d7cac --rm -it -p 5000:5000 --init scoosign/backend
```
