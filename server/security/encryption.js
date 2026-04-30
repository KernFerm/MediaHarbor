const crypto = require('crypto');

function getSharedSecret() {
  const secret = process.env.BACKEND_SHARED_SECRET;
  if (!secret || secret.includes('replace-with')) {
    throw new Error('BACKEND_SHARED_SECRET must be set to a long random value.');
  }
  return secret;
}

function timingSafeEqualString(left, right) {
  const leftBuffer = Buffer.from(String(left || ''), 'utf8');
  const rightBuffer = Buffer.from(String(right || ''), 'utf8');
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function getTunnelAccessToken() {
  return String(process.env.BACKEND_ACCESS_TOKEN || '').trim();
}

function requireTunnelAccessToken(req, _res, next) {
  try {
    const configuredToken = getTunnelAccessToken();
    const shouldRequireToken = process.env.NODE_ENV === 'production' || configuredToken.length > 0;
    if (!shouldRequireToken) {
      next();
      return;
    }

    if (!configuredToken) {
      throw new Error('BACKEND_ACCESS_TOKEN must be set for production tunnel access.');
    }

    const presentedToken = req.get('x-bubbles-access-token');
    if (!presentedToken || !timingSafeEqualString(configuredToken, presentedToken)) {
      throw new Error('Backend access token is missing or invalid.');
    }

    next();
  } catch (error) {
    next(error);
  }
}

function createTunnelToken(payload, ttlMs = 60_000) {
  const expiresAt = Date.now() + ttlMs;
  const body = {
    ...payload,
    expiresAt
  };
  const serialized = JSON.stringify(body);
  const signature = crypto.createHmac('sha256', getSharedSecret()).update(serialized).digest('hex');
  return Buffer.from(JSON.stringify({ body, signature }), 'utf8').toString('base64url');
}

function verifyTunnelToken(req, _res, next) {
  try {
    const token = req.get('x-bubbles-tunnel-token');
    if (!token) {
      throw new Error('Missing tunnel token.');
    }
    const envelope = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
    const serialized = JSON.stringify(envelope.body || {});
    const expected = crypto.createHmac('sha256', getSharedSecret()).update(serialized).digest('hex');
    const matches = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(envelope.signature || ''));
    if (!matches) {
      throw new Error('Tunnel token validation failed.');
    }
    if (!envelope.body?.expiresAt || Date.now() > envelope.body.expiresAt) {
      throw new Error('Tunnel token expired.');
    }
    req.tunnelSession = envelope.body;
    next();
  } catch (error) {
    next(error);
  }
}

function encryptTunnelMetadata(value) {
  const iv = crypto.randomBytes(12);
  const key = crypto.createHash('sha256').update(getSharedSecret()).digest();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    payload: encrypted.toString('base64')
  };
}

module.exports = {
  createTunnelToken,
  verifyTunnelToken,
  encryptTunnelMetadata,
  requireTunnelAccessToken,
  getTunnelAccessToken
};
