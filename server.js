const express = require('express');
const path = require('path');
const app = express();
const http = require('http');

// Create HTTP server
const httpServer = http.createServer(app);

// Initialize Socket.IO with secure WebSocket configuration
const io = require('socket.io')(httpServer, {
    cors: {
        origin: ["https://luck-production.up.railway.app", "http://localhost:8080"],
        methods: ["GET", "POST"],
        allowedHeaders: ["*"],
        credentials: true
    },
    path: '/socket.io/',
    serveClient: true,
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 45000,
    maxHttpBufferSize: 1e8,
    allowUpgrades: true,
    perMessageDeflate: false,
    cookie: false // Disable Socket.IO cookie to prevent conflicts
});

// Enable CORS for Express
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Serve static files
app.use(express.static(__dirname, {
    setHeaders: (res, path) => {
        if (path.endsWith('.mp3')) {
            res.set('Content-Type', 'audio/mpeg');
        }
        if (path.endsWith('.js') || path.endsWith('.css') || path.endsWith('.png') || path.endsWith('.mp3')) {
            res.set('Cache-Control', 'public, max-age=31536000');
        }
    }
}));

// Serve index.html for all routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Socket.IO connection handling with improved error handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('error', (error) => {
        console.error('Socket error:', error);
    });

    socket.on('disconnect', (reason) => {
        console.log('Client disconnected:', socket.id, reason);
    });

    // Handle piano events
    socket.on('keyPress', (data) => {
        socket.broadcast.emit('keyPressed', data);
    });

    socket.on('keyRelease', (data) => {
        socket.broadcast.emit('keyReleased', data);
    });

    socket.on('sustain', (isPressed) => {
        socket.broadcast.emit('sustainChange', isPressed);
    });

    socket.on('chat', (data) => {
        socket.broadcast.emit('chatMessage', data);
    });

    socket.on('cursor', (data) => {
        socket.broadcast.emit('cursorMove', data);
    });
});

// Error handling for the HTTP server
httpServer.on('error', (error) => {
    console.error('HTTP Server Error:', error);
});

// Improved WebSocket upgrade handling
httpServer.on('upgrade', (request, socket, head) => {
    console.log('WebSocket upgrade request received');
    socket.on('error', (error) => {
        console.error('WebSocket upgrade error:', error);
    });
});

const PORT = process.env.PORT || 8080;

// Start server with error handling
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Server root directory: ${__dirname}`);
}); 