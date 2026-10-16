const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PORT = 4200;
const DIST_DIR = path.join(__dirname, 'dist', 'frontend');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp4': 'video/mp4',
  '.xml': 'application/xml',
  '.txt': 'text/plain'
};

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';
  
  let filePath = path.join(DIST_DIR, urlPath);
  
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const acceptEncoding = req.headers['accept-encoding'] || '';
    const headers = {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable'
    };

    if (/\.(html|js|css|json|svg|xml|txt)$/.test(filePath) && acceptEncoding.includes('gzip')) {
      headers['Content-Encoding'] = 'gzip';
      zlib.gzip(data, (gzErr, compressed) => {
        if (!gzErr) {
          res.writeHead(200, headers);
          res.end(compressed);
        } else {
          res.writeHead(200, headers);
          res.end(data);
        }
      });
    } else {
      res.writeHead(200, headers);
      res.end(data);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Production compressed server listening on http://localhost:${PORT}/`);
});
