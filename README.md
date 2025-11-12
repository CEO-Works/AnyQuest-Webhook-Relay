# AnyQuest Webhook Relay

A free, public webhook relay service that receives webhooks from AnyQuest API and broadcasts them via WebSocket to your apps.

**Live Service**: `https://anyquest-webhook-relay-production.up.railway.app`

## Why Use This?

- **Reusable**: One webhook service for all your AnyQuest projects
- **No ngrok needed**: Works with local development without tunneling
- **Easy to use**: Just generate a UUID and connect via WebSocket
- **Multiple apps**: Multiple apps can use it simultaneously
- **Free & Open Source**: Use the public service or deploy your own

## 📖 Documentation

**[→ Read the Complete Usage Guide](USAGE.md)**

The usage guide includes:
- Quick start tutorial
- Complete code examples (Node.js & Browser)
- API reference
- Best practices
- Troubleshooting

## ⚠️ Security Notice

**This is a PUBLIC service** - anyone with the URL can use it:
- ✅ Great for development and testing
- ✅ Perfect for non-sensitive data
- ⚠️ **DO NOT** send confidential or sensitive information
- ⚠️ No authentication required (by design)
- ⚠️ Messages are not logged, but transit through public infrastructure

**For production apps with sensitive data:**
- Deploy your own private instance (see below)
- Add authentication (API keys, tokens)
- Use environment variables for API keys

## How It Works

```
Your App → AnyQuest API (with webhook URL: https://relay.railway.app/webhook/YOUR_UUID)
                ↓
          Webhook Relay receives callback
                ↓
          Broadcasts to WebSocket clients listening to YOUR_UUID
                ↓
          Your App receives the response
```

## Deployment

### Deploy to Railway

1. Push this code to GitHub
2. Create new Railway project from GitHub repo
3. Railway will auto-detect and deploy
4. Get your Railway URL (e.g., `https://anyquest-relay-production.up.railway.app`)

### Environment Variables

No environment variables needed! It just works.

## Usage in Your Apps

### 1. Generate a UUID for your request

```javascript
const { randomUUID } = require('crypto');
const webhookId = randomUUID();
```

### 2. Connect WebSocket to the relay

```javascript
const RELAY_URL = 'wss://anyquest-relay-production.up.railway.app';
const ws = new WebSocket(`${RELAY_URL}/ws?id=${webhookId}`);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received from AnyQuest:', data.content);
};
```

### 3. Send request to AnyQuest with relay webhook URL

```javascript
const response = await axios.post('https://api.anyquest.ai/run', {
  prompt: 'Your topic here',
  webhook: `https://anyquest-relay-production.up.railway.app/webhook/${webhookId}`
}, {
  headers: {
    'x-api-key': YOUR_API_KEY
  }
});
```

### 4. Receive the response via WebSocket

When AnyQuest finishes processing, it calls your webhook URL, and the relay broadcasts it to your WebSocket connection!

## API Endpoints

- `GET /` - Service info
- `GET /health` - Health check and active connections
- `POST /webhook/:id` - Webhook endpoint (for AnyQuest to call)
- `WS /ws?id=:id` - WebSocket endpoint (for your app to connect)

## Local Development

```bash
npm install
npm start
```

Server runs on port 3001 by default.

## Example: Using with Your Apps

See the `example-client.html` file for a complete working example.
