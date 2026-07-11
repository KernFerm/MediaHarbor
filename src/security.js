const path = require('path');
const fs = require('fs');
const os = require('os');
const net = require('net');
const dns = require('dns/promises');

const SUPPORTED_PROTOCOLS = new Set(['http:', 'https:']);
const PRIVATE_HOST_PATTERNS = [/^localhost$/i, /^127\./, /^10\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[0-1])\./, /^\[?::1\]?$/i];

function validatePublicUrl(input) {
  const parsed = parseHttpUrl(input, 'Enter a valid public HTTP or HTTPS URL.');

  if (isBlockedHostname(parsed.hostname)) {
    throw new Error('Private or loopback hosts are not allowed.');
  }

  return parsed.toString();
}

function validateBackendBaseUrl(input) {
  if (!input) {
    throw new Error('Forced tunnel mode requires a backend URL.');
  }

  const parsed = parseHttpUrl(input, 'Backend URL must be a valid HTTP or HTTPS URL.');

  const isLocal = /^localhost$/i.test(parsed.hostname) || /^127\./.test(parsed.hostname);
  if (!isLocal && parsed.protocol !== 'https:') {
    throw new Error('Production tunnel backends must use HTTPS.');
  }

  return parsed.toString().replace(/\/+$/, '');
}

function isSafeExternalUrl(input) {
  try {
    const parsed = new URL(input);
    return SUPPORTED_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

function sanitizeFileName(input) {
  return String(input || 'download')
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180) || 'download';
}

function ensureInsideDirectory(parentDir, candidateName) {
  const resolvedParent = path.resolve(parentDir);
  const resolvedChild = path.resolve(parentDir, candidateName);
  const relative = path.relative(resolvedParent, resolvedChild);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Resolved output path escaped the selected folder.');
  }
  return resolvedChild;
}

async function assertResolvablePublicHttpUrl(input) {
  const parsed = parseHttpUrl(input, 'Enter a valid public HTTP or HTTPS URL.');

  if (isBlockedHostname(parsed.hostname)) {
    throw new Error('Private or loopback hosts are not allowed.');
  }

  let records;
  try {
    records = await dns.lookup(parsed.hostname, { all: true, verbatim: true });
  } catch {
    throw new Error('Unable to resolve the requested host.');
  }

  if (!records.length || records.some((record) => isPrivateIp(record.address))) {
    throw new Error('Private, loopback, or link-local targets are not allowed.');
  }

  return parsed.toString();
}

function parseHttpUrl(input, invalidMessage) {
  let parsed;
  try {
    parsed = new URL(input);
  } catch {
    throw new Error(invalidMessage);
  }

  if (!SUPPORTED_PROTOCOLS.has(parsed.protocol)) {
    throw new Error('Only HTTP and HTTPS public URLs are allowed.');
  }

  return parsed;
}

function isBlockedHostname(hostname) {
  return PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(hostname)) || isPrivateIp(hostname);
}

function isPrivateIp(value) {
  const normalized = normalizeIp(value);
  if (!normalized) {
    return false;
  }

  const family = net.isIP(normalized);
  if (family === 4) {
    const [a, b] = normalized.split('.').map(Number);
    return a === 0
      || a === 10
      || a === 127
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168);
  }

  if (family === 6) {
    const compact = normalized.toLowerCase();
    return compact === '::'
      || compact === '::1'
      || compact.startsWith('fc')
      || compact.startsWith('fd')
      || compact.startsWith('fe8')
      || compact.startsWith('fe9')
      || compact.startsWith('fea')
      || compact.startsWith('feb');
  }

  return false;
}

function normalizeIp(value) {
  const trimmed = String(value || '').trim().replace(/^\[|\]$/g, '');
  if (!trimmed) {
    return '';
  }

  if (trimmed.toLowerCase().startsWith('::ffff:')) {
    return trimmed.slice(7);
  }

  return trimmed;
}

function resolveBinary(binaryName) {
  const executableName = process.platform === 'win32' ? `${binaryName}.exe` : binaryName;
  const candidates = [
    process.env[`${binaryName.toUpperCase()}_PATH`],
    process.resourcesPath ? path.join(process.resourcesPath, executableName) : null,
    process.resourcesPath ? path.join(process.resourcesPath, 'bin', executableName) : null,
    path.join(process.cwd(), 'bin', executableName),
    path.join(process.cwd(), executableName),
    binaryName
  ].filter(Boolean);

  const existingCandidate = candidates.find((candidate) => {
    if (candidate === binaryName) {
      return false;
    }
    return fs.existsSync(candidate);
  });

  return existingCandidate || binaryName;
}

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

function getDefaultDownloadsDir() {
  return path.join(os.homedir(), 'Downloads', 'MediaHarbor');
}

module.exports = {
  validatePublicUrl,
  assertResolvablePublicHttpUrl,
  validateBackendBaseUrl,
  sanitizeFileName,
  ensureInsideDirectory,
  resolveBinary,
  ensureDirectory,
  getDefaultDownloadsDir,
  isSafeExternalUrl
};
