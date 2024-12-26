const express = require('express');
const path = require('path');
const app = express();

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

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Server root directory: ${__dirname}`);
}); 