## Dummy script to send notification about new version deployment to a Slack channel

<a href="https://www.npmjs.com/package/deploy-notify-slack" target="_blank"><img src="https://img.shields.io/npm/v/deploy-notify-slack" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/package/deploy-notify-slack" target="_blank"><img src="https://img.shields.io/npm/l/deploy-notify-slack" alt="Package License" /></a>

- no npm dependencies, plain nodejs 8.x or higher
- use Slack incoming webhooks API to send a message
- can attach version description Markdown files

### Use default message template
You can use default message template with the following env variables:

#### Required env variables

- SLACK_WEBHOOK_URL - you should generate webhook url for your target channel, see: https://api.slack.com/messaging/webhooks
- STAGE - name of an application stage you're deploying, usually: dev, staging, prod..
- VERSION - deployed version

#### Optional env variables

- TITLE - ('Deployment' by default) notification title
- CHANGELOG_PATH - path of your deployed version details file (`changelog` by default as well as we assume that the package installed locally, so this option is required if the package installed globally)

> version details file is a Markdown file having the name like `${STAGE}-v${VERSION}.md`. 
> 
> you can also create cross-environment file with name pattern `v${VERSION}.md` and if script cannot find stage specific description it will get this one.
> 
> If no description file found details block will be omitted in Slack message.

- FAILS_IF_NOT_SENT - (false by default)  Should exit with not 0 error code if message was not sent successfully.

#### How it works

- Generate Slack webhook URL https://api.slack.com/messaging/webhooks

- In Bitbucket pipeline or another place you wish to notify about just deployed version of your application you can add dev dependency
```shell
npm i --no-save deploy-notify-slack@^0.5
```
or major version
```shell
npm i --location=global deploy-notify-slack@^0.5
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
      - npm i --location=global deploy-notify-slack
      - VERSION=$(npm run version --silent)
      - SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL} STAGE=dev VERSION=$VERSION node ./node_modules/deploy-notify-slack/notify
```

or install package globally

```yaml
- step:
    name: Notify Slack
    image: node:16-alpine
    script:
      - npm i --location=global deploy-notify-slack
      - VERSION=$(npm run version --silent)
      - PWD=$(pwd)
      - SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL} STAGE=dev VERSION=$VERSION CHANGELOG_PATH=$PWD/changelog node /usr/local/lib/node_modules/deploy-notify-slack/notify.js
```
> version script above is just a `echo $npm_package_version` command


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
          - npm i --location=global deploy-notify-slack
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

### Use custom message template

You can specify your own message template instead of default one.
It's useful if you want to add some additional information to the message.

Try to use [Slack message builder](https://api.slack.com/tools/block-kit-builder) to create your own message template.

Then you should load your template from file and pass it to the script as env variable `CUSTOM_MESSAGE`:

For example you saved your message template to `message.json` file:
```json
{
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": ":flying_saucer: New API deploy of stage *DEV*",
        "emoji": true
      }
    }
  ]
}
```

Then you can run the script with the following command:
```shell
npm i --location=global deploy-notify-slack@latest
CUSTOM_MESSAGE=$(cat message.json)
SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL} CUSTOM_MESSAGE=$CUSTOM_MESSAGE node /usr/local/lib/node_modules/deploy-notify-slack/notify.js
```