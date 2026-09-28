const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { DownloadManager } = require('../src/downloadManager');
const { ensureInsideDirectory, resolveOutputDirectory } = require('../src/security');

test('output paths cannot escape their selected directory', () => {
  const outputDir = path.join(os.tmpdir(), 'mediaharbor-output');

  assert.throws(
    () => ensureInsideDirectory(outputDir, path.join('..', 'escaped.txt')),
    /escaped the selected folder/
  );
});

test('output directories must be absolute', () => {
  assert.throws(
    () => resolveOutputDirectory(path.join('relative', 'folder')),
    /must be an absolute path/
  );
});

test('downloads ignore renderer-provided output directories', async (t) => {
  const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mediaharbor-security-'));
  const trustedOutputDir = path.join(testRoot, 'trusted');
  const untrustedOutputDir = path.join(testRoot, 'untrusted');
  let dispatchedRequest;
  t.after(() => fs.rmSync(testRoot, { recursive: true, force: true }));

  const manager = new DownloadManager({
    settingsStore: {
      load: async () => ({ outputDir: trustedOutputDir })
    },
    historyStore: {
      append: async () => []
    },
    onProgress: () => {},
    onStateChange: () => {}
  });
  manager.runLocalYtDlp = async (_id, _url, options) => {
    dispatchedRequest = options;
  };

  await manager.startDownload({
    url: 'https://example.com/public-media',
    outputDir: untrustedOutputDir,
    metadata: { title: 'Security test' }
  });

  assert.equal(dispatchedRequest.outputDir, fs.realpathSync.native(trustedOutputDir));
  assert.equal(fs.existsSync(untrustedOutputDir), false);
});

test('download stream route has a dedicated limiter middleware', () => {
  const router = require('../server/routes/download');
  const streamRoute = router.stack.find((layer) => layer.route?.path === '/stream');

  assert.ok(streamRoute, 'expected the /stream route to exist');
  assert.equal(streamRoute.route.stack.length, 4);
});
