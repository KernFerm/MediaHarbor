const crypto = require('crypto');

function deriveKey(secret) {
  const material = secret || process.env.BUBBLES_LOCAL_SETTINGS_SECRET || `${process.env.USERNAME || 'user'}:${process.platform}:${process.arch}`;
  return crypto.createHash('sha256').update(material).digest();
}

function encryptJson(value, secret) {
  const iv = crypto.randomBytes(12);
  const key = deriveKey(secret);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(value), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return JSON.stringify({
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    payload: encrypted.toString('base64')
  });
}

function decryptJson(serialized, secret) {
  if (!serialized) {
    return null;
  }

  const envelope = JSON.parse(serialized);
  const key = deriveKey(secret);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(envelope.payload, 'base64')),
    decipher.final()
  ]);
  return JSON.parse(decrypted.toString('utf8'));
}

module.exports = {
  encryptJson,
  decryptJson
};
