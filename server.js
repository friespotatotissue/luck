const express = require('express');
const path = require('path');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const WebSocket = require('ws');

// Create WebSocket server
const wss = new WebSocket.Server({ server: http });

// Store connected clients
const clients = new Map();

// Serve static files with proper MIME types and caching
app.use(express.static(__dirname, {
    setHeaders: (res, path) => {
        // Set proper MIME types for audio files
        if (path.endsWith('.mp3')) {
            res.set('Content-Type', 'audio/mpeg');
        }
        // Enable caching for static assets
        if (path.endsWith('.js') || path.endsWith('.css') || path.endsWith('.png') || path.endsWith('.mp3')) {
            res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
        }
    }
}));

// Serve index.html for all routes to support client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// WebSocket connection handling
wss.on('connection', (ws) => {
    const clientId = Math.random().toString(36).substr(2, 9);
    clients.set(ws, { id: clientId });

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleWebSocketMessage(ws, data);
        } catch (e) {
            console.error('Error parsing WebSocket message:', e);
        }
    });

    ws.on('close', () => {
        const client = clients.get(ws);
        if (client) {
            // Broadcast participant removal
            broadcastToAll({
                m: "bye",
                p: client.id
            });
            clients.delete(ws);
        }
    });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('A user connected to Socket.IO');

    // Handle piano key press
    socket.on('keyPress', (data) => {
        // Broadcast the key press to all other clients
        socket.broadcast.emit('keyPressed', data);
    });

    // Handle piano key release
    socket.on('keyRelease', (data) => {
        // Broadcast the key release to all other clients
        socket.broadcast.emit('keyReleased', data);
    });

    // Handle sustain pedal
    socket.on('sustain', (isPressed) => {
        socket.broadcast.emit('sustainChange', isPressed);
    });

    // Handle chat messages
    socket.on('chat', (data) => {
        socket.broadcast.emit('chatMessage', data);
    });

    // Handle cursor movement
    socket.on('cursor', (data) => {
        socket.broadcast.emit('cursorMove', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected from Socket.IO');
    });
});

function handleWebSocketMessage(ws, data) {
    const client = clients.get(ws);
    if (!client) return;

    // Handle different message types
    switch (data.m) {
        case "hi":
            // Send initial connection data
            ws.send(JSON.stringify([{
                m: "hi",
                u: { _id: client.id, name: "Anonymous", color: "#888" },
                t: Date.now()
            }]));
            break;
        
        case "ch":
            // Handle channel change
            client.channel = data._id;
            ws.send(JSON.stringify([{
                m: "ch",
                ch: {
                    _id: data._id,
                    settings: {
                        chat: true,
                        visible: true,
                        crownsolo: false,
                        color: "#ecfaed"
                    }
                },
                ppl: []
            }]));
            break;

        case "a":
            // Handle chat message
            if (data.message) {
                broadcastToAll({
                    m: "a",
                    a: data.message,
                    p: { _id: client.id, name: "Anonymous", color: "#888" }
                });
            }
            break;

        case "n":
            // Handle note message
            if (data.n) {
                broadcastToAll({
                    m: "n",
                    n: data.n,
                    p: client.id,
                    t: data.t
                });
            }
            break;
    }
}

function broadcastToAll(message) {
    const messageStr = JSON.stringify([message]);
    clients.forEach((client, ws) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(messageStr);
        }
    });
}

const PORT = process.env.PORT || 8080;
http.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Server root directory: ${__dirname}`);
}); 