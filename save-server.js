const http = require('http');
const fs = require('fs');
const path = require('path');

const imgDir = path.join(__dirname, 'images');
if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });

const bridgePage = `<!DOCTYPE html>
<html><head><title>Image Bridge</title></head>
<body>
<h3>Image Save Bridge</h3>
<div id="status">Waiting for images...</div>
<script>
window.addEventListener('message', async (e) => {
  const {filename, data} = e.data;
  if (!filename || !data) return;
  document.getElementById('status').textContent = 'Saving ' + filename + '...';
  try {
    const resp = await fetch('/save/' + filename, {method: 'POST', body: data});
    const json = await resp.json();
    document.getElementById('status').textContent += ' Done! (' + json.size + ' bytes)';
  } catch(err) {
    document.getElementById('status').textContent += ' Error: ' + err.message;
  }
});
window.opener && window.opener.postMessage({ready: true}, '*');
document.getElementById('status').textContent = 'Bridge ready. Listening for images...';
</script>
</body></html>`;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }
  
  if (req.method === 'GET' && req.url === '/bridge') {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(bridgePage);
    return;
  }
  
  if (req.method === 'POST' && req.url.startsWith('/save/')) {
    const filename = decodeURIComponent(req.url.replace('/save/', ''));
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const buffer = Buffer.from(body, 'base64');
        fs.writeFileSync(path.join(imgDir, filename), buffer);
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({ok: true, file: filename, size: buffer.length}));
        console.log('Saved: ' + filename + ' (' + buffer.length + ' bytes)');
      } catch(e) {
        res.writeHead(500); res.end(JSON.stringify({error: e.message}));
      }
    });
  } else {
    res.writeHead(404); res.end('Not found');
  }
});

server.listen(9876, () => console.log('Save server on http://localhost:9876'));
