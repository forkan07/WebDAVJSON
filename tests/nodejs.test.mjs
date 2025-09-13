import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..');
const HOST = '127.0.0.1';
const PORT = 8001;
const TESTNAME = 'putfile.txt';
const CONTENT = 'hello from test\n';
const UPLOADED = path.join(ROOT, TESTNAME);

async function waitForServer(url, timeout = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url);
      if (res) return;
    } catch (e) {
      // ignore and retry
    }
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('Server did not start');
}

let serverProc;

test.before(async () => {
  // Start node server (index.mjs) with PORT env
  serverProc = spawn('node', ['index.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
  await waitForServer(`http://${HOST}:${PORT}/`);
});

test.after(() => {
  try { serverProc.kill(); } catch (e) {}
  if (fs.existsSync(UPLOADED)) fs.unlinkSync(UPLOADED);
});

test('PUT upload to index.mjs saves file', async () => {
  const url = `http://${HOST}:${PORT}/?filename=${encodeURIComponent(TESTNAME)}`;
  const res = await fetch(url, { method: 'PUT', body: CONTENT });
  if (res.status >= 400) throw new Error('Upload failed: ' + res.status);
  await new Promise(r => setTimeout(r, 100));
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
  assert.ok(Array.isArray(list), 'listing is not an array');
  assert.ok(list.includes(TESTNAME), `listing does not include ${TESTNAME}`);
});

test('DELETE removes file and listing no longer contains it', async () => {
  const delRes = await fetch(`http://${HOST}:${PORT}/?filename=${encodeURIComponent(TESTNAME)}`, { method: 'DELETE' });
  if (delRes.status >= 400) throw new Error('Delete failed: ' + delRes.status);
  await new Promise(r => setTimeout(r, 100));
  const getRes = await fetch(`http://${HOST}:${PORT}/?filename=${encodeURIComponent(TESTNAME)}`);
  if (getRes.status !== 404) throw new Error('Expected 404 after delete, got ' + getRes.status);
  const listRes = await fetch(`http://${HOST}:${PORT}/`);
  const list = await listRes.json();
  assert.ok(!list.includes(TESTNAME), `listing still includes ${TESTNAME} after delete`);
});
