const fs = require('fs');
const path = require('path');

const slackWebHookURL = process.env.SLACK_WEBHOOK_URL;
const stage = process.env.STAGE;
const version = process.env.VERSION;
const title = process.env.TITLE || 'Deployment';
const color = process.env.COLOR || '7f8583';
const emoji = process.env.EMOJI || ':rocket:';
const maxTextBlocksAvailable = process.env.MAX_BLOCKS || 5;

const customMessage = process.env.CUSTOM_MESSAGE;
const changelogPath = process.env.CHANGELOG_PATH || path.join(__dirname, '../../changelog');
const failsIfNotSent = process.env.FAILS_IF_NOT_SENT !== undefined
  ? stringToBool(process.env.FAILS_IF_NOT_SENT, false)
  : false;

function getChangelog() {
  try {
    return fs.readFileSync(path.join(changelogPath, `${stage}-v${version}.md`), 'utf8');
  } catch (e) {
    console.log(`Description "${stage}-v${version}.md" not found in "${changelogPath}"`);
  }
  try {
    return fs.readFileSync(path.join(changelogPath, `v${version}.md`), 'utf8');
  } catch (e) {
    console.log(`Description "v${version}.md" not found in "${changelogPath}"`);
  }
  try {
    return fs.readFileSync(path.join(changelogPath, `changelog.md`), 'utf8');
  } catch (e) {
    console.log(`Description "changelog.md" not found in "${changelogPath}"`);
  }
  return '';
}

function notificationBody() {
  if (customMessage) {
    try {
      return {
        'attachments': [JSON.parse(customMessage)],
      };
    } catch (e) {
      console.error('Failed to parse CUSTOM_MESSAGE as JSON:', e.message);
      process.exit(3);
    }
  }
  let blocks = [
    {
      'type': 'section',
      'text': {
        'type': 'mrkdwn',
        'text': `${emoji} *${title}*`,
      },
    },
    {
      'type': 'section',
      'fields': [
        {
          'type': 'mrkdwn',
          'text': `*stage*\n ${stage}`,
        },
        {
          'type': 'mrkdwn',
          'text': `*version*\n ${version}`,
        },
      ],
    },
  ];

  const changelog = getChangelog();
  if (changelog) {
    const changelogBlocks = splitTextToBlocks(changelog);
    blocks.push(
      {
        'type': 'divider',
      },
    );
    blocks.push({
      'type': 'section',
      'text': {
        'type': 'mrkdwn',
        'text': '*Description:* \n\n' + changelogBlocks[0],
      },
    });
    if (changelogBlocks.length > 1) {
      for (let i = 1; i < changelogBlocks.length; i++) {
        blocks.push({
          'type': 'section',
          'text': {
            'type': 'mrkdwn',
            'text': changelogBlocks[i],
          },
        });
      }
    }
  }
  return {
    'attachments': [
      {
        'color': `#${color}`,
        'blocks': blocks,
      },
    ],
  };
}

/**
 * Handles the actual sending request using fetch API.
 * @param webhookURL
 * @param messageBody
 * @return {Promise}
 */
async function sendSlackMessage(webhookURL, messageBody) {
  const response = await fetch(webhookURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messageBody),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  return response.text();
}

function splitTextToBlocks(text) {
  let blocks = [];
  let startIndex = 0;
  let endIndex = 0;

  const MAX_BLOCK_SIZE = 2500;
  const MAX_SYMBOLS_AVAILABLE = MAX_BLOCK_SIZE * maxTextBlocksAvailable;
  const croppedText = text.length > MAX_SYMBOLS_AVAILABLE ? text.substring(0, MAX_SYMBOLS_AVAILABLE) + '...' : text;

  while (startIndex < croppedText.length) {
    endIndex = startIndex + MAX_BLOCK_SIZE;

    // If the block does not end with a newline character, backtrack to the previous newline character.
    if (endIndex < croppedText.length && croppedText[endIndex] !== '\n') {
      while (endIndex > startIndex && croppedText[endIndex] !== '\n') {
        endIndex--;
      }
    }

    // If end index is greater than text length, just take the rest of the text
    if (endIndex > croppedText.length) {
      endIndex = croppedText.length;
    }

    // Add the block to the array
    blocks.push(croppedText.substring(startIndex, endIndex));

    // Move the start index to the next position, skipping the newline character
    startIndex = endIndex + 1;
  }

  return blocks;
}

function stringToBool(str, defaultValue = false) {
  switch (str.toLowerCase().trim()) {
    case 'true':
    case 'yes':
    case '1':
      return true;

    case 'false':
    case 'no':
    case '0':
    case null:
      return false;

    default:
      return defaultValue;
  }
}

function validate() {
  let success = true;

  if (!slackWebHookURL) {
    console.error('Please fill in slack Webhook URL as SLACK_WEBHOOK_URL env');
    success = false;
  }

  if (customMessage) {
    console.log('Custom message', customMessage);
    return success;
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
(async function() {
  if (!validate()) {
    process.exit(3);
  }
  console.log('Sending slack message');
  try {
    const slackResponse = await sendSlackMessage(slackWebHookURL, notificationBody());
    console.log('Message response', slackResponse);
    if (slackResponse !== 'ok') {
      console.error('There was an error with the request. Check SLACK_WEBHOOK_URL.');
      if (failsIfNotSent) {
        process.exit(4);
      }
    }
  } catch (e) {
    console.error('There was an error with the request', e);
    if (failsIfNotSent) {
      process.exit(5);
    }
  }
})();
