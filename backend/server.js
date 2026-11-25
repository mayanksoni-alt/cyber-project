import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import scanRouter from './src/routes/scan.js';
import authRouter from './src/routes/auth.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.set('trust proxy', 1);

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length
      ? (origin, cb) => {
          if (!origin || allowedOrigins.includes(origin.replace(/\/+$/, ''))) {
            return cb(null, true);
          }
          return cb(new Error('Not allowed by CORS'));
        }
      : true,
    credentials: true,
  })
);
app.use(express.json());

// Root & health checks (used by Render)
app.get('/', (_req, res) => {
  res.json({
    service: 'vuln-scanner-backend',
    status: 'ok',
    health: '/api/health',
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'vuln-scanner-backend' });
});

app.use('/api/auth', authRouter);
app.use('/api', scanRouter);

// Fallback error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n  Vulnerability Scanner API running on http://localhost:${PORT}`);
  console.log(`  Health:  http://localhost:${PORT}/api/health\n`);
});
