const suspiciousAgents = [/curl/i, /wget/i, /python/i, /bot/i, /scanner/i];

function createProofOfWorkChallenge(difficulty = Number(process.env.POW_DIFFICULTY || 3)) {
  const prefix = '0'.repeat(Math.max(1, difficulty));
  return { prefix, difficulty };
}

function botProtection(req, res, next) {
  const userAgent = req.get('user-agent') || '';
  const challengeMode = process.env.CAPTCHA_MODE || 'disabled';

  if (!userAgent) {
    return res.status(400).json({ error: 'User-Agent header is required.' });
  }

  const looksSuspicious = suspiciousAgents.some((pattern) => pattern.test(userAgent));
  if (!looksSuspicious || challengeMode === 'disabled') {
    return next();
  }

  const challenge = createProofOfWorkChallenge();
  const suppliedNonce = req.get('x-bubbles-pow') || '';
  if (!suppliedNonce.startsWith(challenge.prefix)) {
    return res.status(403).json({
      error: 'Suspicious traffic requires proof-of-work or CAPTCHA.',
      challenge
    });
  }

  return next();
}

module.exports = {
  botProtection
};
