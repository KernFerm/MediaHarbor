const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const downloadRoutes = require('./routes/download');
const tunnelRoutes = require('./routes/tunnel');
const { createRateLimiter } = require('./security/rateLimit');
const { botProtection } = require('./security/botProtection');

const app = express();
const port = Number(process.env.APP_PORT || 3467);
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map((value) => value.trim()).filter(Boolean);
const isProduction = process.env.NODE_ENV === 'production';

function assertProductionEnv() {
  if (!process.env.BACKEND_SHARED_SECRET || process.env.BACKEND_SHARED_SECRET.includes('replace-with')) {
    throw new Error('BACKEND_SHARED_SECRET must be set before starting the backend.');
  }

  if (isProduction && String(process.env.BACKEND_BASE_URL || '').startsWith('http://')) {
    throw new Error('BACKEND_BASE_URL must use HTTPS in production.');
  }

  if (isProduction && !String(process.env.BACKEND_ACCESS_TOKEN || '').trim()) {
    throw new Error('BACKEND_ACCESS_TOKEN must be set in production so the tunnel backend cannot be used anonymously.');
  }
}

assertProductionEnv();

app.disable('x-powered-by');
app.set('trust proxy', getTrustProxySetting());

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'none'"],
      baseUri: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'none'"],
      objectSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(express.json({ limit: '64kb' }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origin not allowed.'));
  },
  methods: ['GET', 'POST'],
  credentials: false
}));
app.use(createRateLimiter());
app.use(botProtection);

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'mediaharbor-backend',
    timestamp: new Date().toISOString(),
    logging: 'zero-log'
  });
});

app.use('/api/download', downloadRoutes);
app.use('/api/tunnel', tunnelRoutes);

app.use((error, _req, res, _next) => {
  const status = error.statusCode || 400;
  res.status(status).json({
    error: error.message || 'Request could not be completed securely.'
  });
});

app.listen(port, () => {
  console.log(`MediaHarbor backend listening on port ${port}`);
});

function getTrustProxySetting() {
  const raw = String(process.env.TRUST_PROXY || '').trim().toLowerCase();

  if (!raw) {
    return isProduction ? 1 : false;
  }

  if (raw === 'false' || raw === '0' || raw === 'off' || raw === 'no') {
    return false;
  }

  if (raw === 'loopback' || raw === 'linklocal' || raw === 'uniquelocal') {
    return raw;
  }

  const count = Number(raw);
  if (Number.isInteger(count) && count >= 1) {
    return count;
  }

  return isProduction ? 1 : false;
}
