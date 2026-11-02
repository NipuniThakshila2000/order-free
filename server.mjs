import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {calculateReading} from './src/reading.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3000);
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.jpeg':'image/jpeg','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp'};

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/api/reading') {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 10_000) throw new Error('Request is too large.');
      }
      const result = calculateReading(JSON.parse(body));
      res.writeHead(200, {'content-type':'application/json; charset=utf-8', 'cache-control':'no-store'});
      res.end(JSON.stringify(result));
      return;
    }
    if (req.method !== 'GET') { res.writeHead(405); res.end(); return; }
    const url = new URL(req.url, `http://localhost:${port}`);
    const requested = url.pathname === '/' ? '/index (2).html' : decodeURIComponent(url.pathname);
    const filename = path.resolve(root, '.' + requested);
    if (!filename.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    const file = await fs.readFile(filename);
    res.writeHead(200, {'content-type':mime[path.extname(filename)] || 'application/octet-stream'});
    res.end(file);
  } catch (error) {
    const status = error.code === 'ENOENT' ? 404 : 400;
    res.writeHead(status, {'content-type':'application/json; charset=utf-8'});
    res.end(JSON.stringify({error: status === 404 ? 'Not found.' : error.message}));
  }
});
server.listen(port, () => console.log(`Reading site: http://localhost:${port}`));
