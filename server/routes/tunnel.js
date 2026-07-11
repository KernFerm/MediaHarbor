const express = require('express');
const { encryptTunnelMetadata, createTunnelToken, requireTunnelAccessToken } = require('../security/encryption');
const { assertResolvablePublicHttpUrl } = require('../../src/security');

const router = express.Router();

function validateAllowedMediaHost(input) {
  const configured = String(process.env.ALLOWED_MEDIA_HOSTS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (configured.length === 0) {
    return input;
  }

  const hostname = new URL(input).hostname.toLowerCase();
  const matched = configured.some((entry) => hostname === entry || hostname.endsWith(`.${entry}`));
  if (!matched) {
    throw new Error('Requested media host is not allowed by this backend.');
  }

  return input;
}

router.post('/manifest', requireTunnelAccessToken, async (req, res, next) => {
  try {
    const safeUrl = validateAllowedMediaHost(await assertResolvablePublicHttpUrl(req.body.url));
    const expiresAt = Date.now() + 60_000;
    const tunnelMetadata = encryptTunnelMetadata({
      downloadIntent: 'public-media-only',
      expiresAt,
      requestedAt: Date.now()
    });
    const token = createTunnelToken({
      url: safeUrl,
      audioOnly: Boolean(req.body.audioOnly),
      audioFormat: req.body.audioFormat ? String(req.body.audioFormat) : 'mp3',
      formatId: req.body.formatId ? String(req.body.formatId) : null,
      fileName: String(req.body.fileName || 'download')
    });

    res.json({
      ok: true,
      expiresAt,
      token,
      tunnelMetadata
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
