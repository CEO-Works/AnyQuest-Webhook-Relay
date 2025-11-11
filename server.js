const express = require('express');
const { WebSocketServer } = require('ws');
const cors = require('cors');

// Initialize the Express app
const app = express();
const port = process.env.PORT || 3001;

// Enable CORS for all origins (for local development)
app.use(cors());
app.use(express.json());
app.use(express.text({type: '*/*'}));

// Set up WebSocket server
const wss = new WebSocketServer({ noServer: true });
const clients = new Map(); // Map of webhook IDs to WebSocket connections

// Handle WebSocket connections
wss.on('connection', (ws, request) => {
  const webhookId = new URL(request.url, 'http://localhost').searchParams.get('id');

  if (webhookId) {
    console.log(`WebSocket client connected for webhook ID: ${webhookId}`);

    // Store connection with webhook ID
    if (!clients.has(webhookId)) {
      clients.set(webhookId, []);
    }
    clients.get(webhookId).push(ws);

    ws.on('close', () => {
      console.log(`WebSocket client disconnected for webhook ID: ${webhookId}`);
      const clientList = clients.get(webhookId);
      if (clientList) {
        const index = clientList.indexOf(ws);
        if (index > -1) {
          clientList.splice(index, 1);
        }
        if (clientList.length === 0) {
          clients.delete(webhookId);
        }
      }
    });
  } else {
    console.log('WebSocket client connected without webhook ID');
    ws.close();
  }
});

// Upgrade HTTP server to WebSocket server
app.server = app.listen(port, () => {
  console.log(`AnyQuest Webhook Relay running on port ${port}`);
  console.log(`Webhook URL: http://localhost:${port}/webhook/`);
});

app.server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// Serve basic info page
app.get('/', (req, res) => {
  res.json({
    service: 'AnyQuest Webhook Relay',
    usage: {
      webhook: `${req.protocol}://${req.get('host')}/webhook/:id`,
      websocket: `ws://${req.get('host')}/ws?id=:id`,
      description: 'Connect your app\'s WebSocket to /ws?id=YOUR_UUID and use /webhook/YOUR_UUID as the AnyQuest webhook URL'
    }
  });
});

// Handle webhook POST requests from AnyQuest
app.post('/webhook/:id', (req, res) => {
  const webhookId = req.params.id;
  const eventType = req.headers['aq-event-type'];

  console.log(`Webhook received - ID: ${webhookId}, Event: ${eventType}`);

  // Find all clients listening for this webhook ID
  const clientList = clients.get(webhookId);

  if (clientList && clientList.length > 0) {
    console.log(`Broadcasting to ${clientList.length} client(s)`);

    const payload = {
      id: webhookId,
      eventType: eventType,
      content: req.body,
      headers: {
        'aq-event-type': eventType,
        'aq-activity-job-id': req.headers['aq-activity-job-id'],
        'aq-reference-id': req.headers['aq-reference-id'],
        'aq-instructions': req.headers['aq-instructions']
      }
    };

    clientList.forEach((ws) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(payload));
      }
    });
  } else {
    console.log(`No clients connected for webhook ID: ${webhookId}`);
  }

  res.send('Webhook received successfully');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    activeConnections: Array.from(clients.entries()).map(([id, conns]) => ({
      webhookId: id,
      connections: conns.length
    }))
  });
});
