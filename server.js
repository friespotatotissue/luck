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
    httpCompression: true,
    cookie: {
        name: "io",
        httpOnly: true,
        secure: true
    }
});

// Enable CORS for Express with specific WebSocket headers
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

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

// Socket.IO connection handling with error logging
io.on('connection', (socket) => {
    console.log('A user connected to Socket.IO', socket.id);

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

    socket.on('error', (error) => {
        console.error('Socket.IO Error:', error);
    });

    socket.on('disconnect', (reason) => {
        console.log('User disconnected from Socket.IO', socket.id, reason);
    });
});

// Add error handling for the HTTP server
httpServer.on('error', (error) => {
    console.error('HTTP Server Error:', error);
});

// Add upgrade event handling for WebSocket
httpServer.on('upgrade', (request, socket, head) => {
    console.log('WebSocket upgrade request received');
});

const PORT = process.env.PORT || 8080;

// Start the server with error handling
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Server root directory: ${__dirname}`);
    console.log(`WebSocket server is ready for WSS connections`);
}); 