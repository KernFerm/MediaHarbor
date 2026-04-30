const path = require('path');
const fs = require('fs');
const os = require('os');

const SUPPORTED_PROTOCOLS = new Set(['http:', 'https:']);
const PRIVATE_HOST_PATTERNS = [/^localhost$/i, /^127\./, /^10\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[0-1])\./];

function validatePublicUrl(input) {
  let parsed;
  try {
    parsed = new URL(input);
  } catch {
    throw new Error('Enter a valid public HTTP or HTTPS URL.');
  }

  if (!SUPPORTED_PROTOCOLS.has(parsed.protocol)) {
    throw new Error('Only HTTP and HTTPS public URLs are allowed.');
  }

  if (PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(parsed.hostname))) {
    throw new Error('Private or loopback hosts are not allowed.');
  }

  return parsed.toString();
}

function validateBackendBaseUrl(input) {
  if (!input) {
    throw new Error('Forced tunnel mode requires a backend URL.');
  }

  let parsed;
  try {
    parsed = new URL(input);
  } catch {
    throw new Error('Backend URL must be a valid HTTP or HTTPS URL.');
  }

  if (!SUPPORTED_PROTOCOLS.has(parsed.protocol)) {
    throw new Error('Backend URL must use HTTP or HTTPS.');
  }

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
  if (!resolvedChild.startsWith(resolvedParent)) {
    throw new Error('Resolved output path escaped the selected folder.');
  }
  return resolvedChild;
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
  validateBackendBaseUrl,
  sanitizeFileName,
  ensureInsideDirectory,
  resolveBinary,
  ensureDirectory,
  getDefaultDownloadsDir,
  isSafeExternalUrl
};
