const state = {
  metadata: null,
  settings: null,
  history: [],
  activeDownloads: new Map()
};

const els = {};

document.addEventListener('DOMContentLoaded', async () => {
  cacheElements();
  bindEvents();
  await bootstrap();
});

function cacheElements() {
  const ids = [
    'urlInput',
    'fetchMetadataBtn',
    'downloadBtn',
    'cancelBtn',
    'advancedToggle',
    'themeToggle',
    'outputFolderBtn',
    'settingsForm',
    'statusMessage',
    'downloadList',
    'historyList',
    'metadataCard',
    'metadataTitle',
    'metadataUploader',
    'metadataDuration',
    'metadataFormats',
    'thumbnailImage',
    'qualitySelect',
    'audioFormatSelect',
    'outputFolderInput',
    'audioOnlyToggle',
    'forceTunnelToggle',
    'backendUrlInput',
    'backendAccessTokenInput',
    'historyClearBtn',
    'processBtn',
    'processInputBrowseBtn',
    'processOutputBrowseBtn',
    'processInputPath',
    'processOutputPath',
    'processMode',
    'privacyModeBadge',
    'downloadModeLabel',
    'advancedSection',
    'onboardingPanel',
    'onboardingContent',
    'dismissOnboardingBtn'
  ];

  for (const id of ids) {
    els[id] = document.getElementById(id);
  }
}

function bindEvents() {
  els.fetchMetadataBtn.addEventListener('click', onFetchMetadata);
  els.downloadBtn.addEventListener('click', onStartDownload);
  els.cancelBtn.addEventListener('click', onCancelLatestDownload);
  els.outputFolderBtn.addEventListener('click', onSelectOutputFolder);
  els.settingsForm.addEventListener('submit', onSaveSettings);
  els.themeToggle.addEventListener('click', toggleTheme);
  els.historyClearBtn.addEventListener('click', onClearHistory);
  els.processBtn.addEventListener('click', onLocalProcess);
  els.processInputBrowseBtn.addEventListener('click', onSelectProcessInputFile);
  els.processOutputBrowseBtn.addEventListener('click', onSelectProcessOutputFile);
  els.processMode.addEventListener('change', syncProcessOutputPathWithMode);
  els.forceTunnelToggle.addEventListener('change', syncPrivacyBadge);
  els.audioOnlyToggle.addEventListener('change', syncDownloadModeLabel);
  els.advancedToggle.addEventListener('change', syncAdvancedSection);
  els.dismissOnboardingBtn.addEventListener('click', dismissOnboarding);
  els.backendAccessTokenInput.addEventListener('input', syncPrivacyBadge);
  document.addEventListener('keydown', onGlobalShortcut);

  window.bubbles.onDownloadProgress((payload) => {
    state.activeDownloads.set(payload.id, payload);
    renderDownloads();
  });

  window.bubbles.onDownloadUpdate((payload) => {
    if (payload.history) {
      state.history = payload.history;
      renderHistory();
    }

    if (payload.status === 'error') {
      showStatus(payload.error || 'Download failed.', 'error');
    } else if (payload.status === 'completed') {
      showStatus(`Download finished: ${payload.fileName}`, 'success');
    } else {
      showStatus(payload.message || `Download ${payload.status}.`, 'info');
    }
  });
}

async function bootstrap() {
  const bootstrapData = await window.bubbles.getBootstrap();
  state.settings = bootstrapData.settings;
  state.history = bootstrapData.history;

  applySettingsToForm();
  document.body.dataset.theme = state.settings.theme || bootstrapData.theme;
  syncAdvancedSection();
  syncPrivacyBadge();
  syncDownloadModeLabel();
  renderHistory();
  syncOnboardingPanel();
}

async function onFetchMetadata() {
  const url = els.urlInput.value.trim();
  if (!url) {
    showStatus('Paste a public media URL first.', 'error');
    return;
  }

  showStatus('Fetching metadata preview...', 'info');
  try {
    state.metadata = await window.bubbles.fetchMetadata({
      url,
      backendBaseUrl: els.backendUrlInput.value.trim() || state.settings.backendBaseUrl
    });
    renderMetadata();
    showStatus('Preview loaded. Pick a format if you want, then start the download.', 'success');
  } catch (error) {
    showStatus(error.message || 'Unable to fetch metadata.', 'error');
  }
}

async function onStartDownload() {
  const url = els.urlInput.value.trim();
  const outputDir = els.outputFolderInput.value.trim();
  if (!url || !outputDir) {
    showStatus('A public URL and output folder are required.', 'error');
    return;
  }

  const selectedFormat = els.qualitySelect.value || null;
  const request = {
    url,
    outputDir,
    formatId: selectedFormat,
    audioOnly: els.audioOnlyToggle.checked,
    audioFormat: els.audioFormatSelect.value,
    metadata: state.metadata,
    forcedTunnel: els.forceTunnelToggle.checked,
    backendBaseUrl: els.backendUrlInput.value.trim() || state.settings.backendBaseUrl,
    backendAccessToken: els.backendAccessTokenInput.value.trim() || state.settings.backendAccessToken
  };

  try {
    const response = await window.bubbles.startDownload(request);
    showStatus(response.message, 'info');
  } catch (error) {
    showStatus(error.message || 'Unable to start download.', 'error');
  }
}

async function onCancelLatestDownload() {
  const latestId = Array.from(state.activeDownloads.keys()).at(-1);
  if (!latestId) {
    showStatus('There is no active download to cancel.', 'info');
    return;
  }

  await window.bubbles.cancelDownload(latestId);
  showStatus('Cancellation requested.', 'info');
}

async function onSelectOutputFolder() {
  const folder = await window.bubbles.selectOutputFolder();
  if (folder) {
    els.outputFolderInput.value = folder;
  }
}

async function onSaveSettings(event) {
  event.preventDefault();

  const payload = {
    outputDir: els.outputFolderInput.value.trim(),
    audioFormat: els.audioFormatSelect.value,
    backendBaseUrl: els.backendUrlInput.value.trim(),
    backendAccessToken: els.backendAccessTokenInput.value.trim(),
    forceTunnel: els.forceTunnelToggle.checked,
    advancedMode: els.advancedToggle.checked,
    theme: document.body.dataset.theme
  };

  state.settings = await window.bubbles.saveSettings(payload);
  showStatus('Settings saved locally with encrypted storage for sensitive values.', 'success');
}

async function dismissOnboarding() {
  const nextValue = !Boolean(state.settings.onboardingDismissed);
  state.settings = await window.bubbles.saveSettings({
    onboardingDismissed: nextValue
  });
  syncOnboardingPanel();
}

async function onClearHistory() {
  state.history = await window.bubbles.clearHistory();
  renderHistory();
  showStatus('Local history cleared from this device.', 'success');
}

async function onLocalProcess() {
  const inputPath = els.processInputPath.value.trim();
  const mode = els.processMode.value;
  const outputPath = normalizeOutputPathForMode(els.processOutputPath.value.trim(), mode);

  if (!inputPath || !outputPath) {
    showStatus('Local processing requires both input and output paths.', 'error');
    return;
  }

  try {
    els.processOutputPath.value = outputPath;
    const result = await window.bubbles.runLocalProcessor({ inputPath, outputPath, mode });
    showStatus(result.message, 'success');
  } catch (error) {
    showStatus(error.message || 'Local processing failed.', 'error');
  }
}

async function onSelectProcessInputFile() {
  const selectedPath = await window.bubbles.selectInputFile();
  if (selectedPath) {
    els.processInputPath.value = selectedPath;
    if (!els.processOutputPath.value.trim()) {
      els.processOutputPath.value = buildSuggestedOutputPath(selectedPath, els.processMode.value);
    }
  }
}

async function onSelectProcessOutputFile() {
  const inputPath = els.processInputPath.value.trim();
  const mode = els.processMode.value;
  const fileName = inputPath
    ? buildSuggestedOutputPath(inputPath, mode).split(/[/\\]/).pop()
    : `processed-media.${getSuggestedOutputExtension(mode)}`;
  const selectedPath = await window.bubbles.selectOutputFile({
    defaultPath: fileName,
    mode
  });
  if (selectedPath) {
    els.processOutputPath.value = normalizeOutputPathForMode(selectedPath, mode);
  }
}

function applySettingsToForm() {
  els.outputFolderInput.value = state.settings.outputDir || '';
  els.audioFormatSelect.value = state.settings.audioFormat || 'mp3';
  els.backendUrlInput.value = state.settings.backendBaseUrl || '';
  els.backendAccessTokenInput.value = state.settings.backendAccessToken || '';
  els.forceTunnelToggle.checked = Boolean(state.settings.forceTunnel);
  els.advancedToggle.checked = Boolean(state.settings.advancedMode);
}

function renderMetadata() {
  if (!state.metadata) {
    return;
  }

  const duration = state.metadata.durationString || 'Unknown duration';
  const uploader = buildMetadataCredit(state.metadata);
  const formats = state.metadata.formats || [];

  els.metadataTitle.textContent = state.metadata.title || 'Untitled media';
  els.metadataUploader.textContent = uploader;
  els.metadataDuration.textContent = duration;
  els.thumbnailImage.src = state.metadata.thumbnail || '';
  els.metadataFormats.innerHTML = '';
  els.qualitySelect.innerHTML = '';

  formats.forEach((format) => {
    const li = document.createElement('li');
    li.textContent = `${format.formatId} - ${format.label}`;
    els.metadataFormats.appendChild(li);

    const option = document.createElement('option');
    option.value = format.formatId;
    option.textContent = `${format.label}`;
    els.qualitySelect.appendChild(option);
  });

  if (formats.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Auto / best available';
    els.qualitySelect.appendChild(option);
  }

  els.metadataCard.hidden = false;
}

function renderDownloads() {
  els.downloadList.innerHTML = '';
  const items = Array.from(state.activeDownloads.values());

  if (items.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No active downloads.';
    els.downloadList.appendChild(li);
    return;
  }

  for (const item of items) {
    const li = document.createElement('li');
    li.className = 'progress-item';
    li.innerHTML = `
      <strong>${escapeHtml(item.title || item.fileName || item.id)}</strong>
      <span>${escapeHtml(item.percent || '0%')} complete</span>
      <span>${escapeHtml(item.speed || 'speed unavailable')}</span>
      <span>${escapeHtml(item.eta || 'ETA unavailable')}</span>
      <span>${escapeHtml(item.status || 'running')}</span>
    `;
    els.downloadList.appendChild(li);
  }
}

function renderHistory() {
  els.historyList.innerHTML = '';

  if (!state.history.length) {
    const li = document.createElement('li');
    li.textContent = 'No local download history yet.';
    els.historyList.appendChild(li);
    return;
  }

  for (const item of state.history.slice().reverse()) {
    const li = document.createElement('li');
    li.innerHTML = `
      <strong>${escapeHtml(item.title || item.fileName || 'Download')}</strong>
      <span>${escapeHtml(item.status)}</span>
      <span>${escapeHtml(item.savedAt || '')}</span>
      <span>${escapeHtml(item.outputPath || '')}</span>
    `;
    els.historyList.appendChild(li);
  }
}

function showStatus(message, tone) {
  els.statusMessage.textContent = message;
  els.statusMessage.dataset.tone = tone;
}

function toggleTheme() {
  document.body.dataset.theme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
}

function syncPrivacyBadge() {
  const enabled = els.advancedToggle.checked && els.forceTunnelToggle.checked;
  const hasToken = Boolean(els.backendAccessTokenInput?.value.trim());
  els.privacyModeBadge.textContent = enabled
    ? hasToken ? 'Tunnel locked with token' : 'Tunnel enabled without token'
    : 'Local-first mode';
}

function syncDownloadModeLabel() {
  els.downloadModeLabel.textContent = els.audioOnlyToggle.checked ? 'Audio-only mode' : 'Video / media mode';
}

function syncAdvancedSection() {
  const enabled = els.advancedToggle.checked;
  els.advancedSection.hidden = !enabled;
  syncPrivacyBadge();
}

function syncOnboardingPanel() {
  const collapsed = Boolean(state.settings.onboardingDismissed);
  els.onboardingContent.hidden = collapsed;
  els.dismissOnboardingBtn.textContent = collapsed ? 'Show tips' : 'Hide tips';
}

function onGlobalShortcut(event) {
  const isMac = navigator.platform.toLowerCase().includes('mac');
  const modifierPressed = isMac ? event.metaKey : event.ctrlKey;

  if (modifierPressed && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'l') {
    event.preventDefault();
    els.urlInput.focus();
    els.urlInput.select();
  }
}

function syncProcessOutputPathWithMode() {
  const currentPath = els.processOutputPath.value.trim();
  const inputPath = els.processInputPath.value.trim();

  if (currentPath) {
    els.processOutputPath.value = normalizeOutputPathForMode(currentPath, els.processMode.value);
    return;
  }

  if (inputPath) {
    els.processOutputPath.value = buildSuggestedOutputPath(inputPath, els.processMode.value);
  }
}

function getSuggestedOutputExtension(mode) {
  if (mode === 'extract-audio') {
    return 'mp3';
  }

  return 'mp4';
}

function buildSuggestedOutputPath(inputPath, mode) {
  const extension = getSuggestedOutputExtension(mode);
  return inputPath.replace(/\.[^./\\]+$/, '') + `.${extension}`;
}

function normalizeOutputPathForMode(outputPath, mode) {
  const extension = getSuggestedOutputExtension(mode);

  if (!outputPath) {
    return outputPath;
  }

  if (/\.[^./\\]+$/.test(outputPath)) {
    return outputPath.replace(/\.[^./\\]+$/, `.${extension}`);
  }

  return `${outputPath}.${extension}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildMetadataCredit(metadata) {
  const artist = String(metadata?.artist || '').trim();
  const track = String(metadata?.track || '').trim();
  const uploader = String(metadata?.uploader || metadata?.channel || '').trim();

  if (artist && track) {
    return `${artist} - ${track}`;
  }

  if (artist && uploader && artist !== uploader) {
    return `${artist} - uploaded by ${uploader}`;
  }

  return artist || uploader || 'Unknown artist or uploader';
}
