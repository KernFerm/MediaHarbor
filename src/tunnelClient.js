const { validatePublicUrl, validateBackendBaseUrl } = require('./security');

async function createTunnelSession({ backendBaseUrl, backendAccessToken, url, formatId, audioOnly, audioFormat, fileName, signal }) {
  const safeUrl = validatePublicUrl(url);
  const safeBackendBaseUrl = validateBackendBaseUrl(backendBaseUrl);
  const endpoint = new URL('/api/tunnel/manifest', safeBackendBaseUrl);
  const payload = {
    url: safeUrl,
    formatId,
    audioOnly,
    audioFormat,
    fileName
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(backendAccessToken ? { 'x-bubbles-access-token': backendAccessToken } : {})
    },
    body: JSON.stringify(payload),
    signal
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Unable to create tunnel session.');
  }

  return response.json();
}

async function requestTunnelStream({
  backendBaseUrl,
  backendAccessToken,
  url,
  formatId,
  audioOnly,
  audioFormat,
  fileName,
  signal
}) {
  const safeUrl = validatePublicUrl(url);
  const safeBackendBaseUrl = validateBackendBaseUrl(backendBaseUrl);
  const tunnel = await createTunnelSession({
    backendBaseUrl: safeBackendBaseUrl,
    backendAccessToken,
    url: safeUrl,
    formatId,
    audioOnly,
    audioFormat,
    fileName,
    signal
  });
  const endpoint = new URL('/api/download/stream', safeBackendBaseUrl);
  const payload = {
    url: safeUrl,
    formatId,
    audioOnly,
    audioFormat,
    fileName
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-bubbles-tunnel-token': tunnel.token,
      ...(backendAccessToken ? { 'x-bubbles-access-token': backendAccessToken } : {})
    },
    body: JSON.stringify(payload),
    signal
  });

  if (!response.ok || !response.body) {
    const message = await response.text();
    throw new Error(message || 'Tunnel download request failed.');
  }

  return response;
}

module.exports = {
  requestTunnelStream
};
