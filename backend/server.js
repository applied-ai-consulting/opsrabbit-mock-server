const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        process.env.FRONTEND_URL || 'https://your-react-app.vercel.app'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ 
        message: 'OpsRabbit Webhook Backend Server',
        version: '1.0.0',
        status: 'running',
        endpoints: {
            'GET /api/health': 'Health check',
            'POST /api/send-webhook': 'Send webhook requests',
            'GET /api/stats': 'Server statistics'
        }
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version
    });
});

// Server statistics
app.get('/api/stats', (req, res) => {
    res.json({
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString(),
        requests: global.requestCount || 0
    });
});

// Main webhook endpoint
app.post('/api/send-webhook', async (req, res) => {
    try {
        // Increment request counter
        global.requestCount = (global.requestCount || 0) + 1;
        
        const { webhookUrl, payload } = req.body;
        
        // Validate input
        if (!webhookUrl) {
            return res.status(400).json({ 
                success: false, 
                error: 'webhookUrl is required' 
            });
        }
        
        if (!payload) {
            return res.status(400).json({ 
                success: false, 
                error: 'payload is required' 
            });
        }
        
        // Validate URL format
        try {
            new URL(webhookUrl);
        } catch (urlError) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid webhook URL format' 
            });
        }
        
        console.log(`🚀 Sending webhook to: ${webhookUrl}`);
        console.log(`📦 Payload:`, JSON.stringify(payload, null, 2));
        
        // Send webhook request
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'User-Agent': 'OpsRabbit-Webhook-Backend/1.0',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload),
            timeout: 15000 // 15 second timeout
        });
        
        const responseText = await response.text();
        
        console.log(`📡 Response status: ${response.status}`);
        console.log(`📡 Response: ${responseText.substring(0, 200)}...`);
        
        res.json({ 
            success: response.ok,
            status: response.status,
            statusText: response.statusText,
            response: responseText,
            webhookUrl: webhookUrl,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('💥 Webhook error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            type: error.name,
            timestamp: new Date().toISOString()
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ 
        success: false, 
        error: 'Internal server error',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ 
        success: false, 
        error: 'Endpoint not found',
        availableEndpoints: [
            'GET /',
            'GET /api/health',
            'GET /api/stats',
            'POST /api/send-webhook'
        ]
    });
});

app.listen(PORT, () => {
    console.log(`🚀 OpsRabbit Webhook Backend Server running on port ${PORT}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📡 Webhook endpoint: http://localhost:${PORT}/api/send-webhook`);
    console.log(`📊 Stats endpoint: http://localhost:${PORT}/api/stats`);
});