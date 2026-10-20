import express from 'express';
import cors from 'cors';
import { serverConfig } from './config.js';
import { aiRouter } from './routes/ai.js';
import { documentsRouter } from './routes/documents.js';
import { claimsRouter } from './routes/claims.js';

const app = express();

// Security: Narrow CORS policy restricted to localhost dev origin
const allowedOrigins = [
  'http://127.0.0.1:5173',
  'http://localhost:5173',
  'http://127.0.0.1:4173',
  'http://localhost:4173',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, or server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by InsureOS localhost CORS policy`));
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'InsureOS Local Document Intelligence API',
    version: '1.0.0',
    ollamaBaseUrl: serverConfig.ollamaBaseUrl,
    ollamaModel: serverConfig.ollamaModel,
    timestamp: new Date().toISOString(),
  });
});

// Register routers
app.use('/api/ai', aiRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/claims', claimsRouter);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[InsureOS Server Error]:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// Localhost-only binding: Bind strictly to 127.0.0.1 to avoid exposing to LAN/public internet
const server = app.listen(serverConfig.port, serverConfig.host, () => {
  console.log(`=======================================================`);
  console.log(`InsureOS Local Document Intelligence Service Started`);
  console.log(`Listening on: http://${serverConfig.host}:${serverConfig.port}`);
  console.log(`Configured Ollama URL: ${serverConfig.ollamaBaseUrl}`);
  console.log(`Configured Ollama Model: ${serverConfig.ollamaModel}`);
  console.log(`Security: Bound strictly to ${serverConfig.host}`);
  console.log(`=======================================================`);
});

export default app;
