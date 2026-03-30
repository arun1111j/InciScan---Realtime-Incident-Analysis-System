import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { createProxyMiddleware } from 'http-proxy-middleware';

dotenv.config();

const app = express();
const httpServer = createServer(app);
export const io = new Server(httpServer, {
    cors: {
        origin: "*", // Configure this in production
        methods: ["GET", "POST"]
    }
});

import incidentRoutes from './routes/incidents';

app.use(cors());
app.use(express.json());

// Proxy requests to ML Service
app.use('/ml', createProxyMiddleware({
    target: 'http://localhost:8000',
    changeOrigin: true,
    pathRewrite: {
        '^/ml': '', // remove /ml prefix when sending to FastAPI
    },
    ws: true, // proxy websockets if needed
}));

app.use('/api/incidents', incidentRoutes);

// Serve Static Frontend files in Production
const clientPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientPath));

app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'API is running', ml_service: mlServiceProcess ? 'started' : 'stopped' });
});

// Handle SPA routing - send index.html for all non-API routes
// Using a regex to avoid path-to-regexp string parsing issues in Express 5
app.get(/^(?!\/api).+/, (req: Request, res: Response) => {
    res.sendFile(path.join(clientPath, 'index.html'));
});

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// ML Service Process Management
let mlServiceProcess: ChildProcess | null = null;

const startMLService = () => {
    // In Docker/Linux, look for ml_service relative to the root
    let mlServicePath = path.join(__dirname, '../../ml_service');
    
    // Check if we are running in a built environment
    if (!fs.existsSync(mlServicePath)) {
        mlServicePath = path.join(process.cwd(), 'ml_service');
    }

    console.log('🚀 Starting ML service...');
    console.log('📂 ML service path:', mlServicePath);

    const pythonCmd = process.env.PYTHON_PATH || (process.platform === 'win32' ? 'python' : 'python3');

    mlServiceProcess = spawn(pythonCmd, ['main.py'], {
        cwd: mlServicePath,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
    });

    // Handle ML service output
    mlServiceProcess.stdout?.on('data', (data) => {
        console.log(`[ML Service] ${data.toString().trim()}`);
    });

    mlServiceProcess.stderr?.on('data', (data) => {
        console.error(`[ML Service Error] ${data.toString().trim()}`);
    });

    mlServiceProcess.on('error', (err) => {
        console.error('❌ Failed to start ML service:', err.message);
        console.log('💡 Make sure Python and required packages are installed');
    });

    mlServiceProcess.on('exit', (code, signal) => {
        console.log(`⚠️  ML service exited with code ${code} (signal: ${signal})`);

        // Auto-restart on crash (but not on manual termination)
        if (code !== 0 && signal !== 'SIGTERM') {
            console.log('🔄 Restarting ML service in 3 seconds...');
            setTimeout(startMLService, 3000);
        }
    });

    return mlServiceProcess;
};

// Cleanup function for graceful shutdown
const cleanup = () => {
    console.log('\n🛑 Shutting down InciScan server...');

    if (mlServiceProcess) {
        console.log('🔌 Stopping ML service...');
        mlServiceProcess.kill('SIGTERM');
        mlServiceProcess = null;
    }

    httpServer.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });

    // Force exit if cleanup takes too long
    setTimeout(() => {
        console.error('⚠️  Forced shutdown');
        process.exit(1);
    }, 5000);
};

// Handle shutdown signals
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
    console.log(`✅ InciScan Server is running on port ${PORT}`);
    console.log(`📡 Socket.IO ready for real-time updates`);
    console.log('');

    // Start ML service after server is up
    setTimeout(() => {
        startMLService();
    }, 1000);
});
