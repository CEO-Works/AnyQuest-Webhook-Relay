# AnyQuest Webhook Relay - Usage Guide

A free, public webhook relay service for receiving AnyQuest API callbacks via WebSocket.

## Service URL
**Production**: `https://anyquest-webhook-relay-production.up.railway.app`

## What This Service Does

The AnyQuest API requires a webhook URL to send responses back to your application. This relay service:
1. Receives webhook callbacks from AnyQuest
2. Broadcasts them to your application via WebSocket
3. Works with local development (no ngrok needed!)
4. Supports multiple apps simultaneously

## Quick Start

### Step 1: Generate a Unique Webhook ID

```javascript
const { randomUUID } = require('crypto');
const webhookId = randomUUID(); // e.g., "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

### Step 2: Connect Your WebSocket Client

Connect to the relay's WebSocket endpoint with your webhook ID:

```javascript
const ws = new WebSocket(`wss://anyquest-webhook-relay-production.up.railway.app/ws?id=${webhookId}`);

ws.onopen = () => {
  console.log('Connected to webhook relay');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received from AnyQuest:', data);

  // data structure:
  // {
  //   id: "your-webhook-id",
  //   eventType: "response" or "review",
  //   content: "The actual response content",
  //   headers: { ... AnyQuest headers ... }
  // }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('WebSocket disconnected');
};
```

### Step 3: Send Your Request to AnyQuest

Use the relay's webhook URL in your AnyQuest API request:

**Using curl:**
```bash
curl -X POST https://api.anyquest.ai/run \
  -H "x-api-key: YOUR_ANYQUEST_API_KEY" \
  -F "prompt=Your topic here" \
  -F "webhook=https://anyquest-webhook-relay-production.up.railway.app/webhook/${webhookId}"
```

**Using axios (Node.js):**
```javascript
const axios = require('axios');
const FormData = require('form-data');

const formData = new FormData();
formData.append('prompt', 'Your topic here');
formData.append('webhook', `https://anyquest-webhook-relay-production.up.railway.app/webhook/${webhookId}`);

const response = await axios.post('https://api.anyquest.ai/run', formData, {
  headers: {
    'x-api-key': 'YOUR_ANYQUEST_API_KEY',
    ...formData.getHeaders()
  }
});

console.log('Job ID:', response.data.jobId);
```

**Using fetch (Browser):**
```javascript
const formData = new FormData();
formData.append('prompt', 'Your topic here');
formData.append('webhook', `https://anyquest-webhook-relay-production.up.railway.app/webhook/${webhookId}`);

const response = await fetch('https://api.anyquest.ai/run', {
  method: 'POST',
  headers: {
    'x-api-key': 'YOUR_ANYQUEST_API_KEY'
  },
  body: formData
});

const data = await response.json();
console.log('Job ID:', data.jobId);
```

### Step 4: Receive the Response

When AnyQuest finishes processing, it will call your webhook URL. The relay will automatically broadcast it to your WebSocket connection, and your `ws.onmessage` handler will receive it!

## Complete Example (Node.js)

```javascript
const { randomUUID } = require('crypto');
const axios = require('axios');
const FormData = require('form-data');
const WebSocket = require('ws');

async function getAnyQuestSummary(topic, apiKey) {
  // 1. Generate unique webhook ID
  const webhookId = randomUUID();

  // 2. Connect to relay WebSocket
  const ws = new WebSocket(`wss://anyquest-webhook-relay-production.up.railway.app/ws?id=${webhookId}`);

  return new Promise((resolve, reject) => {
    ws.on('open', async () => {
      console.log('Connected to webhook relay');

      try {
        // 3. Send request to AnyQuest
        const formData = new FormData();
        formData.append('prompt', topic);
        formData.append('webhook', `https://anyquest-webhook-relay-production.up.railway.app/webhook/${webhookId}`);

        const response = await axios.post('https://api.anyquest.ai/run', formData, {
          headers: {
            'x-api-key': apiKey,
            ...formData.getHeaders()
          }
        });

        console.log('Submitted to AnyQuest, Job ID:', response.data.jobId);
      } catch (error) {
        reject(error);
        ws.close();
      }
    });

    ws.on('message', (message) => {
      // 4. Receive the response
      const data = JSON.parse(message);
      console.log('Received response!');
      resolve(data.content);
      ws.close();
    });

    ws.on('error', (error) => {
      reject(error);
    });
  });
}

// Usage
getAnyQuestSummary('Artificial Intelligence', 'YOUR_API_KEY')
  .then(summary => console.log('Summary:', summary))
  .catch(error => console.error('Error:', error));
```

## Complete Example (Browser)

```html
<!DOCTYPE html>
<html>
<head>
  <title>AnyQuest Demo</title>
</head>
<body>
  <h1>AnyQuest Summary Generator</h1>
  <input type="text" id="topic" placeholder="Enter topic">
  <button onclick="getSummary()">Get Summary</button>
  <pre id="output"></pre>

  <script>
    function generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }

    async function getSummary() {
      const topic = document.getElementById('topic').value;
      const output = document.getElementById('output');
      const webhookId = generateUUID();

      // Connect to relay WebSocket
      const ws = new WebSocket(`wss://anyquest-webhook-relay-production.up.railway.app/ws?id=${webhookId}`);

      ws.onopen = async () => {
        output.textContent = 'Connected! Submitting to AnyQuest...';

        // Send to AnyQuest
        const formData = new FormData();
        formData.append('prompt', topic);
        formData.append('webhook', `https://anyquest-webhook-relay-production.up.railway.app/webhook/${webhookId}`);

        try {
          const response = await fetch('https://api.anyquest.ai/run', {
            method: 'POST',
            headers: {
              'x-api-key': 'YOUR_API_KEY'
            },
            body: formData
          });

          const data = await response.json();
          output.textContent = 'Waiting for response... Job ID: ' + data.jobId;
        } catch (error) {
          output.textContent = 'Error: ' + error.message;
        }
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        output.textContent = data.content;
        ws.close();
      };

      ws.onerror = (error) => {
        output.textContent = 'WebSocket error: ' + error;
      };
    }
  </script>
</body>
</html>
```

## API Endpoints

### GET /
Returns service information and usage instructions.

**Response:**
```json
{
  "service": "AnyQuest Webhook Relay",
  "usage": {
    "webhook": "https://anyquest-webhook-relay-production.up.railway.app/webhook/:id",
    "websocket": "wss://anyquest-webhook-relay-production.up.railway.app/ws?id=:id",
    "description": "..."
  }
}
```

### GET /health
Health check endpoint showing active connections.

**Response:**
```json
{
  "status": "ok",
  "activeConnections": [
    {
      "webhookId": "a1b2c3d4-...",
      "connections": 2
    }
  ]
}
```

### POST /webhook/:id
Receives webhook callbacks from AnyQuest (you don't call this directly).

**Headers:**
- `aq-event-type`: "response" or "review"
- `aq-activity-job-id`: Activity job ID (for review events)
- `aq-reference-id`: Reference identifier (optional)
- `aq-instructions`: Instructions for review (optional)

### WebSocket /ws?id=:id
Connect to receive webhook broadcasts for a specific ID.

**Query Parameters:**
- `id` (required): The webhook ID you want to listen for

## AnyQuest Event Types

### 1. Response Event
This is the final LLM-generated response.

**Webhook data:**
```json
{
  "id": "your-webhook-id",
  "eventType": "response",
  "content": "The actual LLM-generated summary...",
  "headers": {
    "aq-event-type": "response"
  }
}
```

### 2. Review Event
AnyQuest may request human review during processing.

**Webhook data:**
```json
{
  "id": "your-webhook-id",
  "eventType": "review",
  "content": "Content requiring review...",
  "headers": {
    "aq-event-type": "review",
    "aq-activity-job-id": "job-123",
    "aq-reference-id": "ref-456",
    "aq-instructions": "Please review this..."
  }
}
```

**To approve/advance:** Send POST to `https://api.anyquest.ai/advance/{activityJobId}`

## Best Practices

### 1. Generate Unique IDs for Each Request
Always create a new UUID for each request to avoid conflicts:
```javascript
const webhookId = randomUUID(); // New ID every time
```

### 2. Connect WebSocket Before Submitting
Connect your WebSocket **before** sending the request to AnyQuest to ensure you don't miss the response:
```javascript
// ✅ Good
ws.onopen = async () => {
  await sendToAnyQuest();
};

// ❌ Bad
await sendToAnyQuest();
ws = new WebSocket(url); // Might miss the response!
```

### 3. Handle Connection Errors
Always implement error handling:
```javascript
ws.onerror = (error) => {
  console.error('Connection failed:', error);
  // Retry logic here
};
```

### 4. Close Connections When Done
Close WebSocket connections when you receive the response:
```javascript
ws.onmessage = (event) => {
  processResponse(event.data);
  ws.close(); // Clean up
};
```

### 5. Set Timeouts
AnyQuest can take time to process. Set appropriate timeouts:
```javascript
const timeout = setTimeout(() => {
  ws.close();
  console.error('Request timed out');
}, 60000); // 60 second timeout

ws.onmessage = (event) => {
  clearTimeout(timeout);
  // Process response
};
```

## Limitations

1. **No Authentication**: This is a public service. Anyone with the URL can use it.
2. **No Persistence**: If the relay restarts, active WebSocket connections are lost (but you can reconnect).
3. **No Message Queue**: If your WebSocket isn't connected when the webhook arrives, the message is lost.
4. **Fair Use**: This is a free service. Please don't abuse it with excessive requests.

## Troubleshooting

### "WebSocket connection failed"
- Check that you're using `wss://` (not `ws://`) for the production URL
- Verify the URL is correct
- Check your network/firewall settings

### "No response received"
- Verify your AnyQuest API key is valid
- Check that you connected the WebSocket **before** submitting to AnyQuest
- Look at browser/server console for errors
- Verify the webhook ID matches between submission and WebSocket connection

### "Application failed to respond" (502 error)
- The relay service might be starting up (Railway cold start)
- Wait 30 seconds and try again
- Check https://anyquest-webhook-relay-production.up.railway.app/health

## Support

This is a free, community service for AnyQuest API users.

- **GitHub**: https://github.com/mavrikeka/AnyQuest-Webhook-Relay
- **Issues**: Report bugs or request features on GitHub

## Privacy & Security

- ⚠️ **No authentication** - Anyone can use this service
- ⚠️ **Public service** - Don't send sensitive data through this relay
- ✅ **No logging** - Webhook content is not logged or stored
- ✅ **No persistence** - Messages are only kept in memory during transit

For production applications with sensitive data, consider:
1. Deploying your own instance of this relay
2. Adding authentication (API keys, tokens)
3. Using a message queue for reliability

## Deploy Your Own Instance

Want to run your own private relay?

1. Fork the repository: https://github.com/mavrikeka/AnyQuest-Webhook-Relay
2. Deploy to Railway, Heroku, or any Node.js host
3. Set your own domain
4. Add authentication if desired

The code is open source and easy to customize!
