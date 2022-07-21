const https = require('https');
const fs = require('fs');
const path = require('path')

const slackWebHookURL = process.env.SLACK_WEBHOOK_URL;
const stage = process.env.STAGE;
const version = process.env.VERSION;
const title = process.env.TITLE || 'Deployment';
const changelogPath = process.env.CHANGELOG_PATH || 'changelog';

function getChangelog() {
  try {
    return fs.readFileSync(path.join(__dirname, '../../', changelogPath, `${stage}-v${version}.md`), 'utf8')
  } catch (e) {
    return '';
  }
}

function notificationBody() {
  let blocks = [
    {
      "type": "section",
      "text": {
          "type": "mrkdwn",
          "text": `:rocket: *${title}*`
        }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": `*stage*\n ${stage}`
        },
        {
          "type": "mrkdwn",
          "text": `*version*\n ${version}`
        }
      ]
    }
  ];

  const changelog = getChangelog();
  if (changelog) {
    blocks.push(
      {
        "type": "divider"
      }
    );
    blocks.push({
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Description:* \n\n" + changelog
      }
    })
  }
  return {
    "attachments": [
      {
        "blocks": blocks
      }
    ]
  };
}

/**
 * Handles the actual sending request.
 * We're turning the https.request into a promise here for convenience
 * @param webhookURL
 * @param messageBody
 * @return {Promise}
 */
function sendSlackMessage (webhookURL, messageBody) {
  // make sure the incoming message body can be parsed into valid JSON
  try {
    messageBody = JSON.stringify(messageBody);
  } catch (e) {
    throw new Error('Failed to stringify messageBody', e);
  }

  // Promisify the https.request
  return new Promise((resolve, reject) => {
    // general request options, we defined that it's a POST request and content is JSON
    const requestOptions = {
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      }
    };

    // actual request
    const req = https.request(webhookURL, requestOptions, (res) => {
      let response = '';


      res.on('data', (d) => {
        response += d;
      });

      // response finished, resolve the promise with data
      res.on('end', () => {
        resolve(response);
      })
    });

    // there was an error, reject the promise
    req.on('error', (e) => {
      reject(e);
    });

    // send our message body (was parsed to JSON beforehand)
    req.write(messageBody);
    req.end();
  });
}

function validate() {
  let success = true;
  if (!slackWebHookURL) {
    console.error('Please fill in slack Webhook URL as SLACK_WEBHOOK_URL env');
    success = false;
  }

  if (!stage) {
    console.error('Please fill in deployed stage as STAGE env');
    success = false;
  }

  if (!version) {
    console.error('Please fill in deployed version as VERSION env');
    success = false;
  }

  return success;
}

// main
(async function () {
  if (!validate()) {
    process.exit(1);
  }

  console.log('Sending slack message');
  try {
    const slackResponse = await sendSlackMessage(slackWebHookURL, notificationBody());
    console.log('Message response', slackResponse);
  } catch (e) {
    console.error('There was a error with the request', e);
  }
})();