## Dummy scrypt to send notification about new version deployment to a Slack channel

- no npm dependencies
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
