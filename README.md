## Dummy script to send notification about new version deployment to a Slack channel

- no npm dependencies, plain nodejs
- use Slack incoming webhooks API to send a message
- can attach version description Markdown files

### ENV Variables

- SLACK_WEBHOOK_URL - you should generate webhook url for your target channel, see: https://api.slack.com/messaging/webhooks
- STAGE - name of an application stage you're deploying, usually: dev, staging, prod..
- VERSION - deployed version
- TITLE - notification title
- CHANGELOG_PATH - path of your deployed version details file `changelog` by default.

> version details file is a Markdown file having the name like `${STAGE}-v${VERSION}.md`. 
> If such file isn't found details block will be omitted in Slack message.

### How it works

- Generate Slack webhook URL https://api.slack.com/messaging/webhooks

- In Bitbucket pipeline or another place you wish to notify about just deployed version of your application you can add dev dependency
```shell
 npm i --no-save git@bitbucket.org:omvmike/deploy-notify-slack.git#semver:latest
```
or major version
```shell
 npm i --no-save git@bitbucket.org:omvmike/deploy-notify-slack.git#semver:^0.1
```

- run the scrypt with your env variables:
```shell
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXXXXXXXXXX STAGE=dev VERSION=1.0.0 node ./node_modules/deploy-notify-slack/notify
```

Bitbucket pipeline example:
```yaml
- step:
    name: Notify deploy
    image: node:16-alpine
    script:
      - apk add --no-cache bash git openssh
      - npm i --no-save git@bitbucket.org:omvmike/deploy-notify-slack.git#semver:^0.1
      - VERSION=$(npm run version --silent)
      - SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL} STAGE=dev VERSION=$VERSION node ./node_modules/deploy-notify-slack/notify
```
or install package globally

```yaml
- step:
    name: Notify Slack
    image: node:16-alpine
    script:
      - apk add --no-cache bash git openssh
      - npm i --location=global git@bitbucket.org:omvmike/deploy-notify-slack.git#semver:^0.1
      - VERSION=$(npm run version --silent)
      - SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL} STAGE=dev VERSION=$VERSION node /usr/local/lib/node_modules/deploy-notify-slack/notify.js
```

Full bitbucket CI/CD pipeline example for deploy NestJs application and send deploy message:
```yaml
image: atlassian/default-image:2
clone:
  depth: full
pipelines:
  default:
    - step:
        name: Test and Build
        image: node:16-alpine
        caches:
          - node
        script:
          - npm ci
          - npm run test:ci
          - npm run build
        services:
          - database
        artifacts:
          - node_modules/**
          - dist/**
    - step:
        name: Pack and deploy to bundle
        script:
          - VERSION=$(npm run version --silent)
          - cp .env.static .env
          - zip -r application.zip . -x "src/*" -x "docker/*" -x "test/*" -x "cloudformation/*"
          - pipe: atlassian/aws-elasticbeanstalk-deploy:1.0.2
            variables:
              AWS_ACCESS_KEY_ID: $AWS_DEV_ACCESS_KEY_ID
              AWS_SECRET_ACCESS_KEY: $AWS_DEV_SECRET_ACCESS_KEY
              AWS_DEFAULT_REGION: $AWS_DEFAULT_REGION
              S3_BUCKET: $AWS_DEV_DEPLOY_BUCKET
              VERSION_LABEL: "DEV-${VERSION}-${BITBUCKET_BUILD_NUMBER}-${BITBUCKET_COMMIT:0:8}"
              APPLICATION_NAME: $AWS_DEV_APP_NAME
              ENVIRONMENT_NAME: $AWS_DEV_EB_ENV_NAME
              ZIP_FILE: "application.zip"
    - step:
        name: Notify Slack
        image: node:16-alpine
        script:
          - apk add --no-cache bash git openssh
          - npm i --location=global git@bitbucket.org:omvmike/deploy-notify-slack.git#semver:^0.1
          - VERSION=$(npm run version --silent)
          - SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL} STAGE=dev VERSION=$VERSION node /usr/local/lib/node_modules/deploy-notify-slack/notify.js
  
definitions:
  services:
    database:
      image: postgres
      user: postgres
      variables:
        POSTGRES_DB: test
        POSTGRES_USER: api
        POSTGRES_PASSWORD: example 
```
