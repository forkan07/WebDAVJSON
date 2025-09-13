import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..');
const HOST = '127.0.0.1';
const PORT = 8000;
const TESTNAME = 'putfile.txt';
const CONTENT = 'hello from test\n';
const UPLOADED = path.join(ROOT, TESTNAME);

async function waitForServer(url, timeout = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url);
      // server responded
      if (res) return;
    } catch (e) {
      // ignore and retry
    }
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('Server did not start');
}

let php;

test.before(async () => {
  php = spawn('php', ['-S', `${HOST}:${PORT}`, 'index.php'], { cwd: ROOT, stdio: 'ignore' });
  await waitForServer(`http://${HOST}:${PORT}/`);
});

test.after(() => {
  try { php.kill(); } catch (e) {}
  if (fs.existsSync(UPLOADED)) fs.unlinkSync(UPLOADED);
});

test('PUT upload to index.php saves file', async () => {
  // perform PUT using fetch API
  const url = `http://${HOST}:${PORT}/?filename=${encodeURIComponent(TESTNAME)}`;
  let res = await fetch(url, {
      method: 'PUT',
      body: CONTENT
    });
  if (res.status >= 400) throw new Error('Upload failed: ' + res.status);

  // give PHP a moment to flush
  await new Promise(r => setTimeout(r, 100));

  // verify file exists
  assert.ok(fs.existsSync(UPLOADED), 'uploaded file not found');

  const a = fs.readFileSync(UPLOADED, 'utf8');
  assert.strictEqual(a, CONTENT, 'uploaded content mismatch');
});

test('GET download returns same content', async () => {
  const getRes = await fetch(`http://${HOST}:${PORT}/?filename=${encodeURIComponent(TESTNAME)}`);
  if (getRes.status >= 400) throw new Error('Download failed: ' + getRes.status);
  const downloaded = await getRes.text();
  assert.strictEqual(downloaded, CONTENT, 'downloaded content mismatch');
});

test('GET listing contains filename', async () => {
  const res = await fetch(`http://${HOST}:${PORT}/`);
  if (res.status >= 400) throw new Error('Listing failed: ' + res.status);
  const list = await res.json();
  // list should be an array of filenames
  assert.ok(Array.isArray(list), 'listing is not an array');
  assert.ok(list.includes(TESTNAME), `listing does not include ${TESTNAME}`);
});

test('DELETE removes file and listing no longer contains it', async () => {
  // perform DELETE
  const delRes = await fetch(`http://${HOST}:${PORT}/?filename=${encodeURIComponent(TESTNAME)}`, { method: 'DELETE' });
  // Server returns 200 or 204 on success; treat >=400 as failure
  if (delRes.status >= 400) throw new Error('Delete failed: ' + delRes.status);

  // give PHP a moment to process
  await new Promise(r => setTimeout(r, 100));

  // GET should now return 404 for the file
  const getRes = await fetch(`http://${HOST}:${PORT}/?filename=${encodeURIComponent(TESTNAME)}`);
  if (getRes.status !== 404) throw new Error('Expected 404 after delete, got ' + getRes.status);

  // listing should no longer include the file
  const listRes = await fetch(`http://${HOST}:${PORT}/`);
  const list = await listRes.json();
  assert.ok(!list.includes(TESTNAME), `listing still includes ${TESTNAME} after delete`);
});
