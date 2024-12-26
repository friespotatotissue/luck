const express = require('express');
const path = require('path');
const app = express();
const http = require('http');

// Create HTTP server
const httpServer = http.createServer(app);

// Initialize Socket.IO
const io = require('socket.io')(httpServer, {
    cors: {
        origin: "*",
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
    cookie: false
});

// Enable CORS for Express
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
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

// Socket.IO connection handling
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

const PORT = process.env.PORT || 8080;

// Start the server
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Server root directory: ${__dirname}`);
}); 