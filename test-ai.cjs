const http = require('http');
const payload = JSON.stringify({ image: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=' });
const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/analyze-frame',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': payload.length
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('STATUS:', res.statusCode, 'DATA FULL:', data));
});
req.on('error', err => console.log('ERROR:', err.message));
req.write(payload);
req.end();
