# deploy-notify-slack

<a href="https://www.npmjs.com/package/deploy-notify-slack" target="_blank"><img src="https://img.shields.io/npm/v/deploy-notify-slack" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/package/deploy-notify-slack" target="_blank"><img src="https://img.shields.io/npm/l/deploy-notify-slack" alt="Package License" /></a>

Send Slack notifications about deployments via incoming webhooks.

## Features

- Zero dependencies - uses native Node.js `fetch()` API
- Automatic changelog attachment from Markdown files
- Customizable colors, emojis, and titles
- Full custom message support via Slack Block Kit
- Simple environment variable configuration

## Requirements

- **Node.js 21+** (uses native `fetch()` API)

> Need Node.js 8.x-20.x support? Use [v0.5.10](https://www.npmjs.com/package/deploy-notify-slack/v/0.5.10)

## Quick Start

1. Generate a [Slack Webhook URL](https://api.slack.com/messaging/webhooks)

2. Run with npx (no installation required):
   ```bash
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXX \
   STAGE=production \
   VERSION=1.0.0 \
   npx deploy-notify-slack
   ```

   Or install and run with node:
   ```bash
   npm install deploy-notify-slack
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXX \
   STAGE=production \
   VERSION=1.0.0 \
   node ./node_modules/deploy-notify-slack/notify.js
   ```

## Installation

**npx (no install required):**
```bash
npx deploy-notify-slack
```

**Local install (recommended for CI/CD):**
```bash
npm install --save-dev deploy-notify-slack
# Run with npx:
npx deploy-notify-slack
# Or run with node:
node ./node_modules/deploy-notify-slack/notify.js
```

**Global install:**
```bash
npm install --location=global deploy-notify-slack
deploy-notify-slack
```

## Configuration

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| `SLACK_WEBHOOK_URL` | Webhook URL for your Slack channel ([how to generate](https://api.slack.com/messaging/webhooks)) |
| `STAGE` | Deployment stage (e.g., `dev`, `staging`, `prod`) |
| `VERSION` | Version being deployed |

### Optional Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TITLE` | `Deployment` | Notification title |
| `COLOR` | `7f8583` | Left bar color (hex without `#`) |
| `EMOJI` | `:rocket:` | Title emoji |
| `MAX_BLOCKS` | `5` | Max 2500-char blocks before truncation |
| `CHANGELOG_PATH` | `./changelog` | Path to changelog directory |
| `FAILS_IF_NOT_SENT` | `false` | Exit with error if send fails |
| `CUSTOM_MESSAGE` | - | JSON for custom Slack Block Kit message |

### Changelog File Resolution

The script looks for changelog files in the following order:

1. `{CHANGELOG_PATH}/{STAGE}-v{VERSION}.md` (stage-specific, e.g., `prod-v1.0.0.md`)
2. `{CHANGELOG_PATH}/v{VERSION}.md` (version-specific, e.g., `v1.0.0.md`)
3. `{CHANGELOG_PATH}/changelog.md` (fallback)

If no changelog file is found, the notification is sent without a changelog attachment.

## CI/CD Integration

### Bitbucket Pipelines

**Using npx (recommended):**
```yaml
- step:
    name: Notify Slack
    image: node:24-alpine
    script:
      - VERSION=$(npm run version --silent)
      - SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL} STAGE=dev VERSION=$VERSION CHANGELOG_PATH=$PWD/changelog npx deploy-notify-slack@^0.6
```

> The `version` script above is `echo $npm_package_version` in package.json

**Local install (caches better in CI):**
```yaml
- step:
    name: Notify Slack
    image: node:24-alpine
    script:
      - npm install --no-save deploy-notify-slack@^0.6
      - VERSION=$(npm run version --silent)
      - SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL} STAGE=dev VERSION=$VERSION CHANGELOG_PATH=$PWD/changelog npx deploy-notify-slack
```

**Full pipeline example (NestJS + AWS Elastic Beanstalk):**
```yaml
image: atlassian/default-image:2
clone:
  depth: full
pipelines:
  default:
    - step:
        name: Test and Build
        image: node:24-alpine
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
        image: node:24-alpine
        script:
          - VERSION=$(npm run version --silent)
          - SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL} STAGE=dev VERSION=$VERSION CHANGELOG_PATH=$PWD/changelog npx deploy-notify-slack@^0.6

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

## Custom Messages

You can specify your own message template instead of the default one using the `CUSTOM_MESSAGE` environment variable.

Use the [Slack Block Kit Builder](https://api.slack.com/tools/block-kit-builder) to design your message, then pass it as JSON:

**Example message.json:**
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

**Usage:**
```bash
CUSTOM_MESSAGE=$(cat message.json)
# With npx:
SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL} CUSTOM_MESSAGE=$CUSTOM_MESSAGE npx deploy-notify-slack
# Or with node:
SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL} CUSTOM_MESSAGE=$CUSTOM_MESSAGE node ./node_modules/deploy-notify-slack/notify.js
```

## License

MIT
