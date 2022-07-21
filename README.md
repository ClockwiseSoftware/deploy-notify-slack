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
 npm i --save-dev git@bitbucket.org:omvmike/deploy-notify-slack.git#semver:latest
```
- run the scrypt with your env variables:
```shell
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXXXXXXXXXX STAGE=dev VERSION=1.0.0 node ./node_modules/deploy-notify-slack/notify
```
