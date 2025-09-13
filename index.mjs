import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import { createServer as createSecureServer } from 'https';
import { createServer as createInsecureServer } from 'http';
import url from 'url';

const allowedExtensions = ['txt','jpg','png','webp','heic','gif','pdf','docx','xlsx','zip','mp4','gz'];

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
}

function authenticate(req, res) {
  const apiKey = '';
  if (apiKey) {
    const auth = req.headers['authorization'];
    if (auth !== `Bearer ${apiKey}`) {
      res.writeHead(401);
      res.end();
      return false;
    }
  }
  return true;
}

function assertFilename(filename, res) {
  if (!/^[\w.-]+$/.test(filename)) {
    res.writeHead(400);
    res.end();
    return false;
  }
  const ext = path.extname(filename).slice(1).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    res.writeHead(400);
    res.end();
    return false;
  }
  return true;
}

function ls(req, res, query) {
  cors(res);
  res.setHeader('Content-Type', 'application/json');
  let files = fs.readdirSync('.').filter(f => f !== '.' && f !== '..');
  if (query.q) {
    files = files.filter(f => f.includes(query.q));
  }
  res.end(JSON.stringify(files, null, 2));
}

function download(req, res, filename, query) {
  if (fs.existsSync(filename)) {
    if (!assertFilename(filename, res)) return;
    if (query.download !== undefined) {
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    }
    res.setHeader('Content-Type', mime.lookup(filename) || 'application/octet-stream');
    fs.createReadStream(filename).pipe(res);
  } else {
    res.writeHead(404);
    res.end();
  }
}

function upload(req, res, query) {
  // ファイルアップロードはform-data解析が必要。ここでは簡易的にPUTのみ対応
  if (query.filename) {
    if (!assertFilename(query.filename, res)) return;
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      fs.writeFileSync(query.filename, data);
      res.end('OK');
    });
  } else {
    res.writeHead(400);
    res.end();
  }
}

function del(req, res, filename) {
  if (fs.existsSync(filename)) {
    fs.unlinkSync(filename);
    res.end('OK');
  } else {
    res.writeHead(404);
    res.end();
  }
}


// Request handler reused by both HTTP and HTTPS servers
function requestHandler(req, res) {
  cors(res);
  if (!authenticate(req, res)) return;
  const parsedUrl = url.parse(req.url, true);
  const query = parsedUrl.query;
  const method = req.method.toUpperCase();

  if (method === 'GET') {
    if (query.filename) {
      download(req, res, query.filename, query);
    } else {
      ls(req, res, query);
    }
  } else if (method === 'POST' || method === 'PUT') {
    upload(req, res, query);
  } else if (method === 'DELETE') {
    if (query.filename) {
      del(req, res, query.filename);
    } else {
      res.writeHead(400);
      res.end();
    }
  } else {
    res.writeHead(405);
    res.end();
  }
}

const CERT_PATH = process.env.CERT_PATH || 'localhost.pem';
const KEY_PATH = process.env.KEY_PATH || 'localhost-key.pem';

if (fs.existsSync(CERT_PATH) && fs.existsSync(KEY_PATH)) {
  const options = {
    cert: fs.readFileSync(CERT_PATH),
    key: fs.readFileSync(KEY_PATH)
  };
  const server = createSecureServer(options, requestHandler).listen(process.env.PORT || 8443);
  console.log(`HTTPS Server running at https://localhost:${server.address()?.port}`);
} else {
  const server = createInsecureServer(requestHandler).listen(process.env.PORT || 8080);
  console.log(`HTTP Server running at http://localhost:${server.address()?.port} (TLS cert/key not found or unreadable)`);
}
